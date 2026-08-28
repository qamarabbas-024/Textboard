import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface IngestionProgressEvent {
  jobId: string;
  datasetId?: string;
  filename: string;
  percent: number;
  recordsProcessed: number;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  error?: string;
  timestamp: string;
}

@Injectable()
export class IngestionEventsGateway {
  private readonly logger = new Logger(IngestionEventsGateway.name);
  private readonly progressSubject = new Subject<IngestionProgressEvent>();

  /**
   * Broadcasts a live ingestion progress milestone.
   */
  emitProgress(event: Omit<IngestionProgressEvent, 'timestamp'>) {
    const payload: IngestionProgressEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    this.progressSubject.next(payload);
  }

  /**
   * Returns an Observable stream of real-time ingestion progress.
   */
  getProgressStream(): Observable<IngestionProgressEvent> {
    return this.progressSubject.asObservable();
  }
}
