﻿namespace CrystalQuartz.Application.Comands.Serialization
{
    using System.IO;
    using CrystalQuartz.Application.Comands.Outputs;

    /// <summary>
    /// 调度器 数据输出序列化程序
    /// </summary>
    public class SchedulerDataOutputSerializer : CommandResultSerializerBase<SchedulerDataOutput>
    {
        /// <summary>
        /// 序列化 成功数据
        /// </summary>
        /// <param name="target"></param>
        /// <param name="output"></param>
        protected override void SerializeSuccessData(SchedulerDataOutput target, TextWriter output)
        {
            output.Write(',');
            output.WritePropertyName("n");
            output.WriteValueString(target.Name);

            output.Write(',');
            output.WritePropertyName("_");
            output.WriteValueString(target.InstanceId);

            output.Write(',');
            output.WritePropertyName("sim");
            output.WriteValueNumber(target.ServerInstanceMarker);

            output.Write(',');
            output.WritePropertyName("st");
            output.WriteValueString(target.Status);

            output.Write(',');
            output.WritePropertyName("jt");
            output.WriteValueNumber(target.JobsTotal);

            output.Write(',');
            output.WritePropertyName("je");
            output.WriteValueNumber(target.JobsExecuted);

            if (target.RunningSince.HasValue)
            {
                output.Write(',');
                output.WritePropertyName("rs");
                output.WriteValueNumber(target.RunningSince.Value);
            }

            /* Events */
            if (target.Events != null && target.Events.Length > 0)
            {
                output.Write(',');
                output.WritePropertyName("ev");
                output.WriteArray(target.Events, new SchedulerEventSerializer());
            }

            if (target.InProgress != null && target.InProgress.Length > 0)
            {
                output.Write(',');
                output.WritePropertyName("ip");
                output.Write('[');
                for (var i = 0; i < target.InProgress.Length; i++)
                {
                    if (i > 0)
                    {
                        output.Write(',');
                    }

                    var executingJobInfo = target.InProgress[i];
                    output.WriteValueString(executingJobInfo.FireInstanceId + "|" + executingJobInfo.UniqueTriggerKey);
                }

                output.Write(']');
            }

            if (target.JobGroups != null && target.JobGroups.Length > 0)
            {
                output.Write(',');
                output.WritePropertyName("jg");
                output.WriteArray(target.JobGroups, new JobGroupSerializer());
            }
        }
    }
}