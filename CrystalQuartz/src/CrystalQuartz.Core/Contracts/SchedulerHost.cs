﻿using System;
using CrystalQuartz.Core.Utils;

namespace CrystalQuartz.Core.Contracts
{
    using CrystalQuartz.Core.Domain.Events;
    using CrystalQuartz.Core.Services;

    public sealed class SchedulerHost
    {
        private readonly ISchedulerEventTarget _eventTarget;
        private readonly long _instanceMarker = DateTime.UtcNow.UnixTicks();

        public SchedulerHost(Version quartzVersion, params string[] errors)
        {
            QuartzVersion = quartzVersion;
            Errors = errors;
            Faulted = true;
        }

        public SchedulerHost(
            ISchedulerClerk clerk, 
            ISchedulerCommander commander, 
            Version quartzVersion, 
            ISchedulerEventHub eventHub, 
            ISchedulerEventTarget eventTarget, 
            IAllowedJobTypesRegistry allowedJobTypesRegistry)
        {
            _eventTarget = eventTarget;
            AllowedJobTypesRegistry = allowedJobTypesRegistry;
            Clerk = clerk;
            Commander = commander;
            QuartzVersion = quartzVersion;
            EventHub = eventHub;
            Faulted = false;
        }

        public Version QuartzVersion { get; }

        public ISchedulerClerk Clerk { get; }

        public ISchedulerCommander Commander { get; }

        public ISchedulerEventHub EventHub { get; }

        public IAllowedJobTypesRegistry AllowedJobTypesRegistry { get; }

        public bool Faulted { get; }

        public string[] Errors { get; }

        public long InstanceMarker
        {
            get { return _instanceMarker; }
        }

        public void RaiseEvent(RawSchedulerEvent @event)
        {
            _eventTarget.Push(@event);
        }
    }
}