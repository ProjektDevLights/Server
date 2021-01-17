import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import moment from 'moment';

@Injectable()
export class CronScheduler {
  constructor( 
    private scheduler: SchedulerRegistry
  ) { }

  private readonly logger = new Logger(CronScheduler.name)


  addCronJob(name: string, cronPattern: string | moment.Moment, repeat: number = 0, callback: (name: string) => void, finished: (name: string) => void, startDate?: Date): void {
    const date = new Date();
    date.setSeconds(date.getSeconds() + 2);
    const startJob = new CronJob(startDate ?? date, () => {
      console.log("starting schedulejob");
      callback(name);
      const job = new CronJob(cronPattern, () => {
        console.log("starting job")
        callback(name);
        this.logger.warn(`time for job ${name} to run!, repeat ${repeat}`);
        if (repeat <= -1) {
          return;
        }
        if (repeat == 0) {
          job.stop();
          this.scheduler.deleteCronJob(name)
          finished(name);
          return;
        }
        repeat--; 
      });

      this.scheduler.addCronJob(name, job);
      job.start();
      this.logger.warn(
        `job ${name} is executed!`,
      );
      startJob.stop();
      this.scheduler.deleteCronJob(name+"-start")
    });
    this.scheduler.addCronJob(name + "-start", startJob);
    startJob.start();
  }

  deleteCron(name: string): CronJob {
    const job = this.scheduler.getCronJob(name);
    this.scheduler.deleteCronJob(name);
    this.scheduler.deleteCronJob(name+"-start");

    this.logger.warn(`job ${name} deleted!`);
    return job;
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
        next = 'error: next fire date is in the past!';
      }
      this.logger.log(`job: ${key} -> next: ${next}`);
      if(key == name){
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
        next = 'error: next fire date is in the past!';
      }
      this.logger.log(`job: ${key} -> next: ${next}`);
      jobArr.push(this.scheduler.getCronJob(key))
    });
    return jobArr;
  }

} 