﻿namespace CrystalQuartz.Core.Domain.Events
{
    public enum SchedulerEventType : short
    {
        Fired = 0,
        Complete = 1,
        Paused = 2,
        Resumed = 3,
        Standby = 4,
        Shutdown = 5
    }
}