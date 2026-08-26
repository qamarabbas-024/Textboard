import { DirectoryWatcherService } from './directory-watcher.service';
import * as fs from 'fs';
import * as path from 'path';

describe('DirectoryWatcherService', () => {
  let service: DirectoryWatcherService;
  let mockIngestionService: any;
  const testDir = path.resolve(process.cwd(), '.textboard', 'test_watcher_dir');

  beforeEach(() => {
    mockIngestionService = {
      submitIngestJob: jest.fn().mockResolvedValue({
        jobId: 'job_test_watch',
        status: 'QUEUED',
      }),
    };

    service = new DirectoryWatcherService(mockIngestionService);
  });

  afterEach(() => {
    service.onModuleDestroy();
    if (fs.existsSync(testDir)) {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch {}
    }
  });

  it('should start and stop watching a directory cleanly', () => {
    const info = service.startWatching(testDir);

    expect(info.active).toBe(true);
    expect(info.directoryPath).toBe(testDir);
    expect(service.getWatchedDirectories().length).toBe(1);

    const stopped = service.stopWatching(info.id);
    expect(stopped).toBe(true);
    expect(service.getWatchedDirectories().length).toBe(0);
  });
});
