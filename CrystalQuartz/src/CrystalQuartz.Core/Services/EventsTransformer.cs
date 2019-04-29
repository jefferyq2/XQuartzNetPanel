﻿namespace CrystalQuartz.Core.Services
{
    using System;
    using CrystalQuartz.Core.Domain.Base;
    using CrystalQuartz.Core.Domain.Events;
    using CrystalQuartz.Core.Services.ExceptionTraversing;
    using CrystalQuartz.Core.Services.JobResultAnalysing;

    public class EventsTransformer : IEventsTransformer
    {
        private readonly IExceptionTransformer _exceptionTransformer;
        private readonly IJobResultAnalyser _jobResultAnalyser;

        public EventsTransformer(
            IExceptionTransformer exceptionTransformer, 
            IJobResultAnalyser jobResultAnalyser)
        {
            _exceptionTransformer = exceptionTransformer;
            _jobResultAnalyser = jobResultAnalyser;
        }

        public SchedulerEvent Transform(int id, RawSchedulerEvent rawEvent)
        {
            JobResult jobResult = GetActualJobResult(rawEvent) ?? JobResult.Success;

            return new SchedulerEvent(
                id,
                DateTime.UtcNow, 
                rawEvent.Scope,
                rawEvent.EventType,
                rawEvent.ItemKey,
                rawEvent.FireInstanceId,
                jobResult.Faulted,
                TransformError(jobResult.Error));
        }

        private ErrorMessage[] TransformError(Exception rawEventError)
        {
            return rawEventError == null ? null : _exceptionTransformer.Transform(rawEventError);
        }

        private JobResult GetActualJobResult(RawSchedulerEvent rawEvent)
        {
            if (rawEvent.Error != null)
            {
                return new JobResult(true, rawEvent.Error);
            }

            if (_jobResultAnalyser != null)
            {
                var resultFromAnalyser = _jobResultAnalyser.Analyse(rawEvent.RawJobResult);
                if (resultFromAnalyser != null)
                {
                    return resultFromAnalyser;
                }
            }

            return JobResult.Success;
        }
    }
}