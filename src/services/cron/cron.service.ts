import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import moment from "moment";

@Injectable()
export class CronService {
  constructor(private scheduler: SchedulerRegistry) {}

  private readonly logger = new Logger(CronService.name);

  addCronJob(
    name: string,
    cronPattern: string | moment.Moment,
    repeat: number = 0,
    callback: (name: string) => void,
    finished: (name: string) => void,
    startDate?: Date,
  ): void {
    const date = new Date();
    date.setSeconds(date.getSeconds() + 2);
    const startJob = new CronJob(startDate ?? date, () => {
      callback(name);
      if (repeat == 0) {
        const job = new CronJob(cronPattern, () => {
          callback(name);
          if (repeat <= -1) {
            return;
          }
          if (repeat == 0) {
            job.stop();
            this.scheduler.deleteCronJob(name);
            finished(name);
            return;
          }
          repeat--;
        });

        this.scheduler.addCronJob(name, job);
        job.start();
      } else {
        finished(name);
      }
      startJob.stop();
      this.scheduler.deleteCronJob(name + "-start");
    });
    this.scheduler.addCronJob(name + "-start", startJob);
    startJob.start();
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
