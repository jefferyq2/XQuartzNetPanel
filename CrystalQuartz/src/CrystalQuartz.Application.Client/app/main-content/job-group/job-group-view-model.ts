﻿import { JobGroup, Job } from '../../api';
import { CommandService } from '../../services';
import { PauseGroupCommand, ResumeGroupCommand, DeleteGroupCommand } from '../../commands/job-group-commands';
import { ApplicationModel } from '../../application-model';
import { ManagableActivityViewModel } from '../activity-view-model';
import ActivitiesSynschronizer from '../activities-synschronizer';
import { JobViewModel } from '../job/job-view-model';
import Timeline from '../../timeline/timeline';
import { IDialogManager } from '../../dialogs/dialog-manager';
import { ISchedulerStateService } from '../../scheduler-state-service';
import Action from '../../global/actions/action';

import {SHOW_SCHEDULE_JOB_DIALOG} from '../../dialogs/show-schedule-job-dialog';

export class JobGroupViewModel extends ManagableActivityViewModel<JobGroup> {
    jobs = js.observableList<JobViewModel>();

    scheduleJobAction = new Action(
        '添加job',
        () => {
            SHOW_SCHEDULE_JOB_DIALOG(
                this.dialogManager,
                this.applicationModel,
                this.commandService,
                {
                    predefinedGroup: this.group.Name
                });
        });

    private jobsSynchronizer: ActivitiesSynschronizer<Job, JobViewModel> = new ActivitiesSynschronizer<Job, JobViewModel>(
        (job: Job, jobViewModel: JobViewModel) => job.Name === jobViewModel.name,
        (job: Job) => new JobViewModel(job, this.name, this.commandService, this.applicationModel, this.timeline, this.dialogManager, this.schedulerStateService),
        this.jobs);

    constructor(
        public group: JobGroup,
        commandService: CommandService,
        applicationModel: ApplicationModel,
        private timeline: Timeline,
        private dialogManager: IDialogManager,
        private schedulerStateService: ISchedulerStateService) {

        super(group, commandService, applicationModel);
    }

    updateFrom(group: JobGroup) {
        super.updateFrom(group);

        this.jobsSynchronizer.sync(group.Jobs);
    }

    getDeleteConfirmationsText(): string {
        return '你想要删除所有job吗?';
    }

    getPauseAction() {
        return {
            title: '暂停所有job',
            command: () => new PauseGroupCommand(this.name)
        };
    }

    getResumeAction() {
        return {
            title: '重启所有job',
            command: () => new ResumeGroupCommand(this.name)
        };
    }

    getDeleteAction() {
        return {
            title: '删除所有job',
            command: () => new DeleteGroupCommand(this.name)
        };
    }
}