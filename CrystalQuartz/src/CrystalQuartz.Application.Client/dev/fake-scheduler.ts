import {ActivityStatus, SchedulerEventScope, SchedulerEventType, SchedulerStatus, ErrorMessage } from "../app/api";
import __filter from 'lodash/filter';
import __map from 'lodash/map';
import __each from 'lodash/each';
import __keys from 'lodash/keys';
import __min from 'lodash/min';
import __flatMap from 'lodash/flatMap';
import __some from 'lodash/some';
import __find from 'lodash/find';
import { Timer } from "../app/global/timers/timer";

export type ScheduleTrigger = {
    repeatInterval: number,
    repeatCount?: number,

    initialDelay?: number,
    pause?: boolean,
    startDate?: number,
    endDate?: number,
    persistAfterExecution?: boolean;
};
export type ScheduleJob = {
    duration: number,
    triggers: { [name:string]: ScheduleTrigger }
};
export type ScheduleGroup = { [name: string]: ScheduleJob };
export type Schedule = { [name:string]: ScheduleGroup };

export abstract class Activity {
    protected constructor(public name: string) {
    }

    abstract getStatus(): ActivityStatus;
    abstract setStatus(status: ActivityStatus);
}

export abstract class CompositeActivity extends Activity {
    protected constructor(name: string) {
        super(name);
    }

    abstract getNestedActivities(): Activity[];

    getStatus(): ActivityStatus {
        const
            activities = this.getNestedActivities(),
            activitiesCount = activities.length;

        if (activitiesCount === 0) {
            return ActivityStatus.Complete;
        }

        let
            activeCount = 0,
            completeCount = 0,
            pausedCount = 0;

        for (let i = 0; i < activitiesCount; i++) {
            const
                activity = activities[i],
                status = activity.getStatus();

            if (status === ActivityStatus.Mixed) {
                return ActivityStatus.Mixed;
            } else if (status === ActivityStatus.Active){
                activeCount++;
            } else if (status === ActivityStatus.Paused){
                pausedCount++;
            } else if (status === ActivityStatus.Complete){
                completeCount++;
            }
        }

        if (activeCount === activitiesCount) {
            return ActivityStatus.Active;
        }

        if (pausedCount === activitiesCount) {
            return ActivityStatus.Paused;
        }

        if (completeCount === activitiesCount) {
            return ActivityStatus.Complete;
        }

        return ActivityStatus.Mixed;
    }

    setStatus(status: ActivityStatus) {
        __each(this.getNestedActivities(), a => a.setStatus(status));
    }
}

/**
 * job��
 */
export class JobGroup extends CompositeActivity {
    constructor(
        name: string,
        public jobs: Job[]){

        super(name);
    }

    getNestedActivities() {
        return this.jobs;
    }

    findJob(jobName: string) {
        return __find(this.jobs, j => j.name === jobName);
    }

    addJob(jobName: string) {
        const result = new Job(jobName, 10000, []);
        this.jobs.push(result);

        return result;
    }
}

/**
 * job
 */
export class Job extends CompositeActivity{
    constructor(
        name: string,
        public duration: number,
        public triggers: Trigger[]){

        super(name);
    }

    getNestedActivities() {
        return this.triggers;
    }
}

/**
 * ������
 */
export class Trigger extends Activity {
    nextFireDate: number;
    previousFireDate: number;

    executedCount: number = 0;

    constructor(
        name: string,
        public status: ActivityStatus,
        public repeatInterval: number,
        public repeatCount: number|null,
        public initialDelay: number,
        public startDate: number|null,
        public endDate: number|null,
        public persistAfterExecution: boolean,
        public duration: number){

        super(name);
    }

    /**
     * ��ȡ״̬
     */
    getStatus() {
        return this.status;
    }
    /**
     * ����״̬
     * @param status
     */
    setStatus(status: ActivityStatus) {
        this.status = status;
    }
    /**
     * �Ƿ����
     */
    isDone(): boolean {
        if (this.repeatCount !== null && this.executedCount >= this.repeatCount) {
            return true;
        }

        if (this.endDate !== null && this.endDate < new Date().getTime()) {
            return true;
        }

        return false;
    }
}

/**
 * �������¼�
 */
export class SchedulerEvent {
    constructor(
        public id: number,
        public date: number,
        public scope: SchedulerEventScope,
        public eventType: SchedulerEventType,
        public itemKey: string,
        public fireInstanceId?: string,
        public faulted: boolean = false,
        public errors: ErrorMessage[] = null
    ){}
}

/**
 * Fake ������
 */
export class FakeScheduler {
    startedAt: number|null = null;
    status:SchedulerStatus = SchedulerStatus.Ready;

    private _groups: JobGroup[];
    private _triggers: Trigger[];
    private _events: SchedulerEvent[] = [];

    private _fireInstanceId = 1;
    private _latestEventId = 1;

    private _timer = new Timer();

    jobsExecuted = 0;
    inProgress: { trigger: Trigger, fireInstanceId: string, startedAt: number, completesAt: number }[] = [];

    constructor(
        public name: string,
        private schedule: Schedule
    ) {}

    private mapTrigger(name: string, duration: number, trigger: ScheduleTrigger){
        return new Trigger(
            name,
            trigger.pause ? ActivityStatus.Paused : ActivityStatus.Active,
            trigger.repeatInterval,
            trigger.repeatCount || null,
            trigger.initialDelay || 0,
            trigger.startDate || null,
            trigger.endDate || null,
            !!trigger.persistAfterExecution,
            duration);
    }
    /**
     * ��ʼ��
     */
    init() {
        const
            mapJob = (name: string, data: ScheduleJob) => new Job(
                name,
                data.duration,
                __map(
                    __keys(data.triggers),
                    key => this.mapTrigger(key, data.duration, data.triggers[key]))),

            mapJobGroup = (name: string, data: ScheduleGroup) => new JobGroup(
                name,
                __map(__keys(data), key => mapJob(key, data[key])));

        this._groups = __map(
            __keys(this.schedule),
            key => mapJobGroup(key, this.schedule[key]));

        this._triggers = __flatMap(
            this._groups,
            g => __flatMap(g.jobs, j => j.triggers));
    }

    /**
     * ��ʼ�� ������
     * @param trigger
     */
    private initTrigger(trigger: Trigger) {
        trigger.startDate = trigger.startDate || new Date().getTime(),
        trigger.nextFireDate = trigger.startDate + trigger.initialDelay;
    }

    /**
     * ��ʼ
     */
    start() {
        const now = new Date().getTime();
        if (this.startedAt === null) {
            this.startedAt = now;
        }

        this.status = SchedulerStatus.Started;

        __each(this._triggers, trigger => {
            this.initTrigger(trigger);
        });

        this.pushEvent(SchedulerEventScope.Scheduler, SchedulerEventType.Resumed, null);
        this.doStateCheck();
    }

    /**
     * ��ȡ����
     */
    getData() {
        return {
            name: this.name,
            groups: this._groups,
            jobsCount: __flatMap(this._groups, g => g.jobs).length
        };
    }

    /**
     * ���� �¼�
     * @param minEventId
     */
    findEvents(minEventId: number) {
        return __filter(this._events, ev => ev.id > minEventId);
    }

    /**
     * ״̬���
     */
    private doStateCheck() {
        this._timer.reset();

        const
            now = new Date().getTime(),

            triggersToStop = __filter(this.inProgress, item => {
                return item.completesAt <= now;
            });

        __each(triggersToStop, item => {
            const index = this.inProgress.indexOf(item);
            this.inProgress.splice(index, 1);
            this.jobsExecuted++;
            item.trigger.executedCount++;
            this.pushEvent(SchedulerEventScope.Trigger, SchedulerEventType.Complete, item.trigger.name, item.fireInstanceId);
        });

        if (this.status === SchedulerStatus.Started) {
            const triggersToStart = __filter(this._triggers, trigger => {
                return trigger.status === ActivityStatus.Active &&
                    (!trigger.isDone()) &&
                    trigger.nextFireDate <= now &&
                    !this.isInProgress(trigger);
            });

            __each(triggersToStart, trigger => {
                const fireInstanceId = (this._fireInstanceId++).toString();

                trigger.previousFireDate = now;
                trigger.nextFireDate = now + trigger.repeatInterval;

                this.inProgress.push({
                    trigger: trigger,
                    startedAt: now,
                    completesAt: now + trigger.duration,
                    fireInstanceId: fireInstanceId
                });

                this.pushEvent(SchedulerEventScope.Trigger, SchedulerEventType.Fired, trigger.name, fireInstanceId);
            });
        }

        const triggersToDeactivate = __filter(this._triggers, trigger => trigger.isDone());
        __each(triggersToDeactivate, trigger => {
            if (trigger.persistAfterExecution) {
                trigger.setStatus(ActivityStatus.Complete);
            } else {
                this.deleteTriggerInstance(trigger);
            }
        });

        let nextUpdateAt: number|null = null;

        if (this.inProgress.length > 0) {
            nextUpdateAt = __min(__map(this.inProgress, item => item.startedAt + item.trigger.duration));
        }

        const activeTriggers:Trigger[] = __filter<Trigger>(this._triggers, trigger => trigger.status === ActivityStatus.Active && trigger.nextFireDate);
        if (this.status !== SchedulerStatus.Shutdown && activeTriggers.length > 0) {
            const nextTriggerFireAt = __min(__map(activeTriggers, item => item.nextFireDate));

            nextUpdateAt = nextUpdateAt === null ? nextTriggerFireAt : Math.min(nextUpdateAt, nextTriggerFireAt);
        }

        if (nextUpdateAt === null) {
            if (this.status === SchedulerStatus.Shutdown) {
                this._timer.dispose();
            } else {
                this.status = SchedulerStatus.Empty;
            }
        } else {
            if (this.status === SchedulerStatus.Empty) {
                this.status = SchedulerStatus.Started;
            }

            const nextUpdateIn = nextUpdateAt - now;

            this._timer.schedule(
                () => this.doStateCheck(),
                nextUpdateIn);
        }
    }

    /**
     * �Ƿ� ���ڽ�����
     * @param trigger
     */
    private isInProgress(trigger: Trigger) {
        return __some(this.inProgress, item => item.trigger === trigger);
    }

    /**
     * �����¼�
     * @param scope
     * @param eventType
     * @param itemKey
     * @param fireInstanceId
     */
    private pushEvent(scope: SchedulerEventScope, eventType: SchedulerEventType, itemKey: string, fireInstanceId?: string) {
        const faulted = Math.random() > 0.5; /* todo: ÿ��job�� ������ */

        this._events.push({
            id: this._latestEventId++,
            date: new Date().getTime(),
            scope: scope,
            eventType: eventType,
            itemKey: itemKey,
            fireInstanceId: fireInstanceId,
            faulted: faulted,
            errors: faulted ? [new ErrorMessage(0, 'Test exception text'), new ErrorMessage(1, 'Inner exception text')] : null
        });

        while (this._events.length > 1000) {
            this._events.splice(0, 1);
        }
    }

    /**
     * ��ѯ ������
     * @param triggerName
     */
    private findTrigger(triggerName: string) {
        const result = __filter(this._triggers, t => t.name === triggerName);
        return result.length > 0 ? result[0] : null;
    }
    /**
     * ��ѯgroup
     * @param groupName
     */
    private findGroup(groupName: string) {
        const result = __filter(this._groups, t => t.name === groupName);
        return result.length > 0 ? result[0] : null;
    }

    /**
     * �ı䴥����״̬
     * @param triggerName
     * @param status
     */
    private changeTriggerStatus(triggerName: string, status: ActivityStatus) {
        const trigger = this.findTrigger(triggerName);
        if (trigger) {
            trigger.setStatus(status);
        }

        this.doStateCheck();
        this.pushEvent(SchedulerEventScope.Trigger, this.getEventTypeBy(status), trigger.name)
    }

    /**
     * ����job״̬
     * @param groupName
     * @param jobName
     * @param status
     */
    private changeJobStatus(groupName: string, jobName: string, status: ActivityStatus) {
        const group: JobGroup = this.findGroup(groupName);
        if (group) {
            const job = group.findJob(jobName);
            job.setStatus(status);

            this.doStateCheck();
            this.pushEvent(SchedulerEventScope.Job, this.getEventTypeBy(status), group.name + '.' + job.name)
        }
    }

    /**
     * �ı�group״̬
     * @param groupName
     * @param status
     */
    private changeGroupStatus(groupName: string, status: ActivityStatus) {
        const group: JobGroup = this.findGroup(groupName);
        if (group) {
            group.setStatus(status);
            this.doStateCheck();
            this.pushEvent(SchedulerEventScope.Group, this.getEventTypeBy(status), group.name)
        }
    }

    /**
     * �ı�Scheduler״̬
     * @param status
     */
    private changeSchedulerStatus(status: ActivityStatus) {
        __each(this._groups, g => g.setStatus(status));
        this.doStateCheck();
        this.pushEvent(SchedulerEventScope.Scheduler, this.getEventTypeBy(status), null);
    }

    private getEventTypeBy(status: ActivityStatus): SchedulerEventType {
        if (status === ActivityStatus.Paused) {
            return SchedulerEventType.Paused;
        }

        if (status === ActivityStatus.Active) {
            return SchedulerEventType.Resumed;
        }

        throw new Error('��֧�ֵĻ״̬ ' + status.title);
    }

    /**
     * ��������������
     * @param triggerName
     */
    resumeTrigger(triggerName: string) {
        this.changeTriggerStatus(triggerName, ActivityStatus.Active);
    }

    /**
     * ��ͣ ������
     * @param triggerName
     */
    pauseTrigger(triggerName: string) {
        this.changeTriggerStatus(triggerName, ActivityStatus.Paused);
    }

    /**
     * ɾ�� ������
     * @param triggerName
     */
    deleteTrigger(triggerName: string) {
        const trigger = this.findTrigger(triggerName);
        if (trigger) {
           this.deleteTriggerInstance(trigger);
        }
    }

    /**
     * ɾ��������ʵ��
     * @param trigger
     */
    private deleteTriggerInstance(trigger: Trigger) {
        this.removeTriggerFromMap(trigger);

        const allJobs = __flatMap(this._groups, g => g.jobs);

        __each(allJobs, job => {
            const triggerIndex = job.triggers.indexOf(trigger);
            if (triggerIndex > -1) {
                job.triggers.splice(triggerIndex, 1);
            }
        });
    }

    /**
     * ��map��ɾ��������
     * @param trigger
     */
    private removeTriggerFromMap(trigger: Trigger) {
        const index = this._triggers.indexOf(trigger);
        this._triggers.splice(index, 1);
    }

    /**
     * ɾ��job
     * @param groupName
     * @param jobName
     */
    deleteJob(groupName: string, jobName: string) {
        const
            group = this.findGroup(groupName),
            job= group.findJob(jobName),
            jobIndex = group.jobs.indexOf(job);

        group.jobs.splice(jobIndex, 1);

        __each(job.triggers, trigger => this.removeTriggerFromMap(trigger));
    }

    /**
     * ɾ��group
     * @param groupName
     */
    deleteGroup(groupName: string) {
        const
            group = this.findGroup(groupName),
            groupIndex = this._groups.indexOf(group),
            triggers = __flatMap(group.jobs, j => j.triggers);

        this._groups.splice(groupIndex, 1);

        __each(triggers, trigger => this.removeTriggerFromMap(trigger))
    }

    /**
     * ��ͣjob
     * @param groupName
     * @param jobName
     */
    pauseJob(groupName: string, jobName: string) {
        this.changeJobStatus(groupName, jobName, ActivityStatus.Paused);
    }

    /**
     * ����job
     * @param groupName
     * @param jobName
     */
    resumeJob(groupName: string, jobName: string) {
        this.changeJobStatus(groupName, jobName, ActivityStatus.Active);
    }

    /**
     * ��ͣgroup
     * @param groupName
     */
    pauseGroup(groupName) {
        this.changeGroupStatus(groupName, ActivityStatus.Paused);
    }

    /**
     * ����group
     * @param groupName
     */
    resumeGroup(groupName: string) {
        this.changeGroupStatus(groupName, ActivityStatus.Active);
    }

    /**
     * ��ͣ����
     */
    pauseAll() {
        this.changeSchedulerStatus(ActivityStatus.Paused);
    }
    /**
     * ��������
     */
    resumeAll() {
        this.changeSchedulerStatus(ActivityStatus.Active);
    }
    
    standby() {
        this.status = SchedulerStatus.Ready;
        this.pushEvent(SchedulerEventScope.Scheduler, SchedulerEventType.Paused, null);
    }

    /**
     * �ػ�
     */
    shutdown() {
        this.status = SchedulerStatus.Shutdown;
        this._groups = [];
        this._triggers = [];
        this.doStateCheck();

        alert('������е� Fake������ �ոչرա�ˢ��ҳ�棬�������¿�ʼ��')
    }

    /**
     * ����job
     * @param groupName
     * @param jobName
     * @param triggerName
     * @param triggerData
     */
    triggerJob(groupName: any, jobName: string, triggerName: any, triggerData: ScheduleTrigger) {
        const
            actualGroupName = groupName || 'Default',
            group = this.findGroup(actualGroupName) || this.addGroup(actualGroupName),
            job = group.findJob(jobName) || group.addJob(jobName || GuidUtils.generate()),
            trigger = this.mapTrigger(triggerName || GuidUtils.generate(), job.duration, triggerData);

        job.triggers.push(trigger);
        this._triggers.push(trigger);
        this.initTrigger(trigger);
        this.doStateCheck();
    }
    /**
     * ����ִ��
     * @param groupName
     * @param jobName
     */
    executeNow(groupName: string, jobName: string) {
        this.triggerJob(groupName, jobName, null, { repeatCount: 1, repeatInterval: 1 })
    }
    /**
     * ���group
     * @param name
     */
    private addGroup(name: string) {
        const result = new JobGroup(name, []);
        this._groups.push(result);
        return result;
    }
}

/**
 * Guid����
 */
class GuidUtils {
    /**
     * ����guid
     */
    static generate(): string {
        const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }
}