﻿import {ConfigurationStep, ConfigurationStepData} from './configuration-step';
import {SelectOption} from '../../common/select-option';
import {SchedulerExplorer} from '../../../scheduler-explorer';
import {Validators} from '../../common/validation/validators';

import __map from 'lodash/map';
import {MAP} from '../../../global/map';
import {ValidatorsFactory} from '../../common/validation/validators-factory';
import {Owner} from '../../../global/owner';

export class JobGroupType {
    static None = 'none';
    static Existing = 'existing';
    static New = 'new';
}

export class GroupConfigurationStep extends Owner implements ConfigurationStep {
    code = 'group';
    navigationLabel = 'Configure Group';

    jobGroupType = new js.ObservableValue<string>();
    jobGroupTypeOptions = new js.ObservableList<SelectOption>();
    existingJobGroups = new js.ObservableList<SelectOption>();
    selectedJobGroup = new js.ObservableValue<string>();
    newJobGroup = new js.ObservableValue<string>();

    validators = new Validators();

    constructor(
        private schedulerExplorer: SchedulerExplorer) {

        super();

        const groups = __map(schedulerExplorer.listGroups(), g => (
            { value: g.Name, title: g.Name }
        ));

        this.existingJobGroups.setValue([
            { value: '', title: '- 选择一个job group -'},
            ...groups
        ]);

        this.jobGroupTypeOptions.add({ value: JobGroupType.None, title: '不指定（使用默认值）' });
        if (groups.length > 0) {
            this.jobGroupTypeOptions.add({ value: JobGroupType.Existing, title: '使用存在的group' });
        }

        this.jobGroupTypeOptions.add({ value: JobGroupType.New, title: '定义新group' });

        this.jobGroupType.setValue(JobGroupType.None);

        this.validators.register(
            {
                source: this.selectedJobGroup,
                condition: this.own(MAP(this.jobGroupType, x => x === JobGroupType.Existing))
            },
            ValidatorsFactory.required('请选择一个group'));

        this.own(this.validators);
    }

    onLeave(data: ConfigurationStepData): ConfigurationStepData {
        return {
            groupName: this.getGroupName(),
            jobClass: data.jobClass,
            jobName: data.jobName
        }
    }

    getGroupName(): string|null {
        const jobGroupType = this.jobGroupType.getValue();

        if (jobGroupType === JobGroupType.None) {
            return null;
        } else if (jobGroupType === JobGroupType.Existing) {
            return this.selectedJobGroup.getValue();
        } else if (jobGroupType === JobGroupType.New) {
            return this.newJobGroup.getValue();
        }

        return null;
    }

    releaseState() {
        this.dispose();
    }
}