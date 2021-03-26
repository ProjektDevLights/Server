import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";

@Injectable()
export class CronService {
  constructor(private scheduler: SchedulerRegistry) {}

  private readonly logger = new Logger(CronService.name);

  addCron(name: string, cronPattern: string, callback: (name: string) => void) {
    const job = new CronJob(cronPattern, () => {
      callback(name);
    });
    this.scheduler.addCronJob(name, job);
    job.start();
  }

  deleteCron(name: string): boolean {
    let fail = 0;
    try {
      this.scheduler.deleteCronJob(name);
    } catch {
      fail++;
    }
    try {
      this.scheduler.deleteCronJob(name + "-start");
    } catch {
      fail++;
    }

    this.logger.warn(`job ${name} deleted!`);
    return fail < 2;
  }

  getCron(name: string): CronJob {
    return this.scheduler.getCronJob(name);
  }

  getCronKey(name: string): string {
    const jobs = this.scheduler.getCronJobs();
    const jobArr: CronJob[] = [];
    jobs.forEach((value, key, map) => {
      let next;
      try {
        next = value.nextDates().toDate();
      } catch (e) {
        next = "error: next fire date is in the past!";
      }
      this.logger.log(`job: ${key} -> next: ${next}`);
      if (key == name) {
        return key;
      }
    });
    throw new NotFoundException("Corn could not be found");
  }

  getAllCrons(): CronJob[] {
    const jobs = this.scheduler.getCronJobs();
    const jobArr: CronJob[] = [];
    jobs.forEach((value, key, map) => {
      let next;
      try {
        next = value.nextDates().toDate();
      } catch (e) {
        next = "error: next fire date is in the past!";
      }
      this.logger.log(`job: ${key} -> next: ${next}`);
      jobArr.push(this.scheduler.getCronJob(key));
    });
    return jobArr;
  }
}
