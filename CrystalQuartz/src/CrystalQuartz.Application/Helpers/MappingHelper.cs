﻿namespace CrystalQuartz.Application.Helpers
{
    using System.Linq;
    using CrystalQuartz.Application.Comands.Outputs;
    using CrystalQuartz.Core.Domain;
    using CrystalQuartz.Core.Utils;

    public static class MappingHelper
    {
        public static void MapToOutput(this SchedulerData schedulerData, SchedulerDataOutput output)
        {
            output.InstanceId = schedulerData.InstanceId;
            output.JobGroups = schedulerData.JobGroups.ToArray();
            output.JobsExecuted = schedulerData.JobsExecuted;
            output.JobsTotal = schedulerData.JobsTotal;
            output.Name = schedulerData.Name;
            output.RunningSince = schedulerData.RunningSince?.UnixTicks();
            output.Status = schedulerData.Status.ToString().ToLower();
            output.InProgress = schedulerData.InProgress.ToArray();
            output.ServerInstanceMarker = output.ServerInstanceMarker;
        }
    }
}