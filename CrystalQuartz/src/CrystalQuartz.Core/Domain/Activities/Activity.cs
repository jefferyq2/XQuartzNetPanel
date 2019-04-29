using CrystalQuartz.Core.Domain.Base;

namespace CrystalQuartz.Core.Domain.Activities
{
    public class Activity : NamedObject
    {
        public Activity(string name, ActivityStatus status) : base(name)
        {
            Status = status;
        }

        public Activity(string name) : base(name)
        {
        }

        public ActivityStatus Status { get; }
    }
}