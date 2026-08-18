import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as Database from 'better-sqlite3';
import * as path from 'path';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public isLocalFallback = false;
  private sqliteDb: Database.Database | null = null;

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to PostgreSQL database successfully.');
    } catch (err: any) {
      this.isLocalFallback = true;
      this.logger.warn('PostgreSQL is not running on localhost:5432. Seamlessly activating local-first SQLite fallback.');
      this.initSqliteFallback();
    }
  }

  private initSqliteFallback() {
    const dbPath = path.resolve(process.cwd(), 'archive_local.db');
    this.sqliteDb = new Database(dbPath);
    this.sqliteDb.pragma('journal_mode = WAL');

    // Create tables
    this.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS datasets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sourceType TEXT NOT NULL,
        metadata TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS timeline_events (
        id TEXT PRIMARY KEY,
        datasetId TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        actor TEXT,
        content TEXT NOT NULL,
        eventType TEXT DEFAULT 'message',
        metadata TEXT,
        FOREIGN KEY (datasetId) REFERENCES datasets(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_events_dataset_time ON timeline_events(datasetId, timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_dataset_actor ON timeline_events(datasetId, actor);

      CREATE TABLE IF NOT EXISTS metrics (
        id TEXT PRIMARY KEY,
        datasetId TEXT NOT NULL,
        name TEXT NOT NULL,
        value REAL,
        stringValue TEXT,
        jsonValue TEXT,
        category TEXT,
        metadata TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (datasetId) REFERENCES datasets(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS highlights (
        id TEXT PRIMARY KEY,
        datasetId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        score REAL,
        metadata TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (datasetId) REFERENCES datasets(id) ON DELETE CASCADE
      );
    `);

    // Override Prisma Client model proxies if in fallback mode
    this.setupProxies();
  }

  private setupProxies() {
    const db = this.sqliteDb!;

    // Proxy dataset
    (this as any).dataset = {
      create: async (args: any) => {
        const id = args.data.id || `ds_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const name = args.data.name;
        const sourceType = args.data.sourceType || 'text-chat';
        const metadata = args.data.metadata ? JSON.stringify(args.data.metadata) : null;

        const stmt = db.prepare(`
          INSERT INTO datasets (id, name, sourceType, metadata) VALUES (?, ?, ?, ?)
        `);
        stmt.run(id, name, sourceType, metadata);

        return {
          id,
          name,
          sourceType,
          metadata: args.data.metadata,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
      findUnique: async (args: any) => {
        const id = args.where.id;
        const stmt = db.prepare(`SELECT * FROM datasets WHERE id = ?`);
        const row: any = stmt.get(id);
        if (!row) return null;

        return {
          ...row,
          metadata: row.metadata ? JSON.parse(row.metadata) : null,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
        };
      },
      findFirst: async (args: any) => {
        let sql = `SELECT * FROM datasets`;
        const params: any[] = [];
        if (args?.where?.name?.contains) {
          sql += ` WHERE name LIKE ?`;
          params.push(`%${args.where.name.contains}%`);
        }
        sql += ` LIMIT 1`;
        const row: any = db.prepare(sql).get(...params);
        if (!row) return null;

        const countRow: any = db.prepare(`SELECT COUNT(*) as c FROM timeline_events WHERE datasetId = ?`).get(row.id);
        return {
          ...row,
          metadata: row.metadata ? JSON.parse(row.metadata) : null,
          _count: { events: countRow?.c || 0 },
        };
      },
      count: async (args: any) => {
        let sql = `SELECT COUNT(*) as c FROM datasets`;
        const params: any[] = [];
        if (args?.where?.id) {
          sql += ` WHERE id = ?`;
          params.push(args.where.id);
        }
        const row: any = db.prepare(sql).get(...params);
        return row ? Number(row.c) : 0;
      },
      delete: async (args: any) => {
        const id = args.where.id;
        db.prepare(`DELETE FROM datasets WHERE id = ?`).run(id);
        return { id };
      },
    };

    // Proxy timelineEvent
    (this as any).timelineEvent = {
      createMany: async (args: any) => {
        const rows = args.data;
        const stmt = db.prepare(`
          INSERT INTO timeline_events (id, datasetId, timestamp, actor, content, eventType, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMany = db.transaction((items: any[]) => {
          for (const item of items) {
            const id = item.id || `ev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            const ts = item.timestamp instanceof Date ? item.timestamp.toISOString() : new Date(item.timestamp).toISOString();
            const meta = item.metadata ? JSON.stringify(item.metadata) : null;
            stmt.run(id, item.datasetId, ts, item.actor || null, item.content, item.eventType || 'message', meta);
          }
        });

        insertMany(rows);
        return { count: rows.length };
      },
      findMany: async (args: any) => {
        let sql = `SELECT * FROM timeline_events WHERE datasetId = ?`;
        const params: any[] = [args.where.datasetId];

        if (args.where?.actor) {
          if (typeof args.where.actor === 'object' && args.where.actor.not === null) {
            sql += ` AND actor IS NOT NULL`;
          } else if (typeof args.where.actor === 'string') {
            sql += ` AND actor = ?`;
            params.push(args.where.actor);
          }
        }

        if (args.where?.timestamp) {
          if (args.where.timestamp.gte) {
            sql += ` AND timestamp >= ?`;
            params.push(new Date(args.where.timestamp.gte).toISOString());
          }
          if (args.where.timestamp.lte) {
            sql += ` AND timestamp <= ?`;
            params.push(new Date(args.where.timestamp.lte).toISOString());
          }
        }

        if (args.where?.content?.contains) {
          sql += ` AND content LIKE ?`;
          params.push(`%${args.where.content.contains}%`);
        }

        if (args.where?.eventType) {
          sql += ` AND eventType = ?`;
          params.push(args.where.eventType);
        }

        if (args.orderBy?.timestamp) {
          sql += ` ORDER BY timestamp ${args.orderBy.timestamp.toUpperCase()}`;
        } else {
          sql += ` ORDER BY timestamp ASC`;
        }

        if (args.take) {
          sql += ` LIMIT ${args.take}`;
        }

        const rows: any[] = db.prepare(sql).all(...params);
        return rows.map((r) => ({
          ...r,
          metadata: r.metadata ? JSON.parse(r.metadata) : null,
          timestamp: new Date(r.timestamp),
        }));
      },
      findFirst: async (args: any) => {
        let sql = `SELECT * FROM timeline_events WHERE datasetId = ?`;
        const params: any[] = [args.where.datasetId];

        if (args.where?.content?.contains) {
          sql += ` AND content LIKE ?`;
          params.push(`%${args.where.content.contains}%`);
        }
        if (args.where?.eventType) {
          sql += ` AND eventType = ?`;
          params.push(args.where.eventType);
        }
        if (args.orderBy?.timestamp) {
          sql += ` ORDER BY timestamp ${args.orderBy.timestamp.toUpperCase()}`;
        }
        if (args.skip) {
          sql += ` LIMIT 1 OFFSET ${args.skip}`;
        } else {
          sql += ` LIMIT 1`;
        }

        const row: any = db.prepare(sql).get(...params);
        if (!row) return null;
        return {
          ...row,
          metadata: row.metadata ? JSON.parse(row.metadata) : null,
          timestamp: new Date(row.timestamp),
        };
      },
      count: async (args: any) => {
        let sql = `SELECT COUNT(*) as c FROM timeline_events WHERE datasetId = ?`;
        const params: any[] = [args.where.datasetId];

        if (args.where?.actor) {
          sql += ` AND actor = ?`;
          params.push(args.where.actor);
        }
        if (args.where?.content?.contains) {
          sql += ` AND content LIKE ?`;
          params.push(`%${args.where.content.contains}%`);
        }
        if (args.where?.eventType) {
          sql += ` AND eventType = ?`;
          params.push(args.where.eventType);
        }

        const row: any = db.prepare(sql).get(...params);
        return row ? Number(row.c) : 0;
      },
    };

    // Proxy metric
    (this as any).metric = {
      createMany: async (args: any) => {
        const stmt = db.prepare(`
          INSERT INTO metrics (id, datasetId, name, value, stringValue, jsonValue, category, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const insert = db.transaction((items: any[]) => {
          for (const item of items) {
            const id = item.id || `m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            stmt.run(
              id,
              item.datasetId,
              item.name,
              item.value ?? null,
              item.stringValue ?? null,
              item.jsonValue ? JSON.stringify(item.jsonValue) : null,
              item.category ?? null,
              item.metadata ? JSON.stringify(item.metadata) : null,
            );
          }
        });
        insert(args.data);
        return { count: args.data.length };
      },
      findMany: async (args: any) => {
        const rows: any[] = db.prepare(`SELECT * FROM metrics WHERE datasetId = ?`).all(args.where.datasetId);
        return rows;
      },
    };

    // Proxy highlight
    (this as any).highlight = {
      createMany: async (args: any) => {
        const stmt = db.prepare(`
          INSERT INTO highlights (id, datasetId, title, description, score, metadata)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        const insert = db.transaction((items: any[]) => {
          for (const item of items) {
            const id = item.id || `hl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            stmt.run(
              id,
              item.datasetId,
              item.title,
              item.description ?? null,
              item.score ?? null,
              item.metadata ? JSON.stringify(item.metadata) : null,
            );
          }
        });
        insert(args.data);
        return { count: args.data.length };
      },
      findMany: async (args: any) => {
        const rows: any[] = db.prepare(`SELECT * FROM highlights WHERE datasetId = ?`).all(args.where.datasetId);
        return rows;
      },
    };

    // Proxy $queryRaw for SQLite fallback queries
    (this as any).$queryRaw = async (strings: any, ...values: any[]) => {
      let query = '';
      if (typeof strings === 'string') {
        query = strings;
      } else if (Array.isArray(strings)) {
        query = strings.reduce((acc, part, i) => acc + part + (values[i] !== undefined ? '?' : ''), '');
      }

      // Convert postgres-specific syntax to SQLite if needed
      if (query.includes('timeline_events') && query.includes('char_length')) {
        const datasetId = values[0];
        const row = db.prepare(`
          SELECT id, datasetId, timestamp, actor, content, eventType, LENGTH(content) as char_length
          FROM timeline_events
          WHERE datasetId = ? AND eventType = 'message'
          ORDER BY LENGTH(content) DESC
          LIMIT 1
        `).get(datasetId);
        return row ? [row] : [];
      }

      if (query.includes('actor') && query.includes('message_count')) {
        const datasetId = values[0];
        const rows = db.prepare(`
          SELECT 
            actor,
            COUNT(*) as message_count,
            SUM(LENGTH(content)) as total_chars,
            MIN(timestamp) as first_active,
            MAX(timestamp) as last_active
          FROM timeline_events
          WHERE datasetId = ? AND actor IS NOT NULL
          GROUP BY actor
          ORDER BY message_count DESC
        `).all(datasetId);
        return rows;
      }

      if (query.includes("date_trunc('day', timestamp)")) {
        const datasetId = values[0];
        const rows = db.prepare(`
          SELECT DISTINCT SUBSTR(timestamp, 1, 10) as day
          FROM timeline_events
          WHERE datasetId = ?
          ORDER BY day ASC
        `).all(datasetId);
        return rows;
      }

      if (query.includes('EXTRACT(MONTH FROM timestamp)')) {
        const datasetId = values[0];
        const month = values[1];
        const day = values[2];
        const rows = db.prepare(`
          SELECT id, timestamp, actor, content, eventType
          FROM timeline_events
          WHERE datasetId = ?
          ORDER BY timestamp ASC
          LIMIT 100
        `).all(datasetId);
        return rows;
      }

      return [];
    };
  }

  async onModuleDestroy() {
    if (this.sqliteDb) {
      this.sqliteDb.close();
    }
    await this.$disconnect().catch(() => {});
  }
}
