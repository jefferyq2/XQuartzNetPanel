﻿using CrystalQuartz.Core.Contracts;

namespace CrystalQuartz.Application.Comands
{
    using System;
    using System.Reflection;
    using CrystalQuartz.Application.Comands.Inputs;
    using CrystalQuartz.Application.Comands.Outputs;

    public class GetEnvironmentDataCommand : AbstractSchedulerCommand<NoInput, EnvironmentDataOutput>
    {
        private readonly string _customCssUrl;
        private readonly string _dotNetVersion;
        private readonly TimeSpan _timelineSpan;

        public GetEnvironmentDataCommand(Func<SchedulerHost> schedulerHostProvider, string customCssUrl, TimeSpan timelineSpan, string dotNetVersion) : base(schedulerHostProvider)
        {
            _customCssUrl = customCssUrl;
            _timelineSpan = timelineSpan;
            _dotNetVersion = dotNetVersion;
        }

        protected override void InternalExecute(NoInput input, EnvironmentDataOutput output)
        {
            Assembly callingAssembly = Assembly.GetCallingAssembly();

            output.SelfVersion = GetAssemblyVersion(callingAssembly);
            output.QuartzVersion = FormatAssemblyVersion(SchedulerHost.QuartzVersion);
            output.DotNetVersion = _dotNetVersion;
            output.CustomCssUrl = _customCssUrl;
            output.TimelineSpan = (int) _timelineSpan.TotalMilliseconds;
        }

        private string GetAssemblyVersion(Assembly assembly)
        {
            var version = assembly.GetName().Version;
            return FormatAssemblyVersion(version);
        }

        private static string FormatAssemblyVersion(Version version)
        {
            return string.Format("v{0}", version);
        }
    }
}