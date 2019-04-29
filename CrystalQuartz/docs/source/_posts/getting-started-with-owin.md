---
title: Getting Started with OWIN
categories:
- [Getting Started]
---

This article describes how you can use OWIN version of CrystalQuartz to
plug [Quartz.NET](http://www.quartz-scheduler.net/) Scheduler viewer into
your application.

<!--more-->

## Pre-requirements ##

It is assumed that you already have an OWIN application up and running.
That application can be either web or console acting as a self-host for
OWIN pipeline. The only thing that is required is having an instance of
`IAppBuilder` object available. For web applications it is in `Startup.cs` 
file and for console app it is exactly where you running the `WebServer`.
 
<table class="code-split-table">
<tr class="description">
    <td>Typical entry point for OWIN web-application</td>
    <td>Typical entry point for self-hosted OWIN application</td>
</tr>
<tr class="code">
<td>
```cs Startup.cs
public partial class Startup
{
    public void Configuration(IAppBuilder app)
    {
        // CrystalQuartz will be configured here
    }
}
```
</td>
<td>
```cs Program.cs
class Program
{
    static void Main(string[] args)
    {
        WebApp.Start(
            "http://localhost:3000", 
            (IAppBuilder app) => {
                // CrystalQuartz will be configured here
            });
    }
}
```
</td>
</tr>
</table>

It is also assumed you have Quartz.NET v2 or v3 installed and the scheduler 
instance available.

## 1 Setup ##

As a first step, you need to install
[CrystalQuartz.Owin](http://nuget.org/List/Packages/CrystalQuartz.Owin)
NuGet package to the target project:

```bash
Install-Package CrystalQuartz.Owin
```

That will add a `CrystalQuartz.Owin.dll` reference to your project.
The `CrystalQuartz.Owin.dll` is a single dll that contains all the
resources needed for CrystalQuartz to work.

## 2 Configuration ##

As a next step, you need to hook CrystalQuartz middleware into your 
OWIN pipeline. It should be done by calling `UseCrystalQuartz` 
extension method at the moment of the pipeline initialization. 

Make sure to add the using statement at the top of the entry point file.

```cs
using CrystalQuartz.Owin;
```

The generic syntax for panel configuration should be placed in the entry 
point method:

```cs
/*
 * app is your IAppBuilder instance
 */
app.UseCrystalQuartz(schedulerProvider, options);
```

The arguments are:

* `schedulerOrProvider` is a provider pointing to the scheduler instance;
* `options` is an optional object for panel customization.

### 2.1 Configuration - Scheduler

This section describes different ways of passing `schedulerProvider` argument
to the `UseCrystalQuartz` method. You need to pick one of these options.

#### 2.1.1 Scheduler provider

If you already have an `IScheduler` object instance then you can pass a `Func` 
pointing to it to the configuration extension method:

```cs
public void Configuration(IAppBuilder app)
{
    IScheduler scheduler = CreateScheduler();

    /*
     * Init CrystalQuartz Panel with scheduler instance.
     */
    app.UseCrystalQuartz(() => scheduler);
}

private IScheduler CreateScheduler() 
{
    IScheduler scheduler = StdSchedulerFactory.GetDefaultScheduler();
    
    // define the job and tie it to our HelloJob class
    IJobDetail job = JobBuilder.Create<HelloJob>()
        .WithIdentity("job1", "group1")
        .Build();

    // Trigger the job to run now, and then repeat every 10 seconds
    ITrigger trigger = TriggerBuilder.Create()
        .WithIdentity("trigger1", "group1")
        .StartNow()
        .WithSimpleSchedule(x => x
        .WithIntervalInSeconds(10)
        .RepeatForever())
        .Build();

    // Tell quartz to schedule the job using our trigger
    scheduler.ScheduleJob(job, trigger);

    scheduler.Start();
    
    return scheduler;
}
```

Using this technique you can manually configure panel to work with a
remote scheduler:

```cs
public void Configuration(IAppBuilder app)
{
    string url = "tcp://localhost:555/QuartzScheduler"; // YOUR URL HERE

    NameValueCollection properties = new NameValueCollection();
    properties["quartz.scheduler.proxy"] = "true";
    properties["quartz.scheduler.proxy.address"] = url; 

    ISchedulerFactory schedulerFactory = new StdSchedulerFactory(properties);
    IScheduler scheduler = schedulerFactory.GetScheduler();

    /*
     * Init CrystalQuartz Panel with Remote scheduler instance.
     */
    app.UseCrystalQuartz(() => scheduler);
}
```

You can get it from an IoC container:

```cs
public void Configuration(IAppBuilder app)
{
    /* ... */
    
    /* 
     * Make sure your scheduler is configured
     * as singleton in the IoC container 
     */
    app.UseCrystalQuartz(() => container.Resolve<IScheduler>());
}
```

#### 2.1.2 Legacy Scheduler provider

Non-OWIN version of CrystalQuartz Panel uses internal `ISchedulerProvider` abstraction for 
getting access to the scheduler instance. You can pass an instance of `ISchedulerProvider` 
as a first argument of `UseCrystalQuartz` call. That might be helpful in some rare cases.

If you are migrating from [CrystalQuartz.Simple](http://nuget.org/List/Packages/CrystalQuartz.Simple) to 
[CrystalQuartz.Owin](http://nuget.org/List/Packages/CrystalQuartz.Owin) and you already have 
your custom implementation of `ISchedulerProvider`: 

```cs
public class MySchedulerProvider : ISchedulerProvider
{
    public object CreateScheduler(ISchedulerEngine engine)
    {
        IScheduler scheduler = StdSchedulerFactory.GetDefaultScheduler();
        
        var jobDetail = JobBuilder.Create<HelloJob>()
            .WithIdentity("myJob")
            .StoreDurably()
            .Build();

        var trigger = TriggerBuilder.Create()
            .WithIdentity("myTrigger")
            .StartNow()
            .WithSimpleSchedule(x => x.WithIntervalInMinutes(1).RepeatForever())
            .Build();

        scheduler.ScheduleJob(jobDetail, trigger);
    }
}
```

In this case you can pass the same provider instance to the `UseCrystalQuartz` call:

```cs
public void Configuration(IAppBuilder app)
{
    /* ... */
    app.UseCrystalQuartz(new MySchedulerProvider());
}
```

If you are going to connect to a remote scheduler the `RemoteSchedulerProvider` 
implementation of `ISchedulerProvider` would be more concise than the explicit
configuration:

```cs
public class Startup
{
    public void Configuration(IAppBuilder app)
    {
        app.UseCrystalQuartz(new RemoteSchedulerProvider
        {
            SchedulerHost = "tcp://localhost:555/QuartzScheduler"
        });
    }
}
```

### 2.2 Options

Second (optional) argument of `UseCrystalQuartz` method allows to do some panel customizations. 
The object should be an instance of `CrystalQuartzOptions` class. Please check the [options class
source code](https://github.com/guryanovev/CrystalQuartz/blob/master/src/CrystalQuartz.Application/CrystalQuartzOptions.cs) for details.

## 3 Running the panel ##

Once the configuration is done, you can run your project and navigate to `http://YOUR_URL/quartz` 
to see the panel UI. 

## 4 Examples ##

Please check these samples demonstrating different cases of using CrystalQuartz with OWIN environment:

- [OWIN Self-hosted console app example](//github.com/guryanovev/CrystalQuartz/tree/master/examples/01_Owin_SelfHosted)
- [OWIN Simple site](//github.com/guryanovev/CrystalQuartz/tree/master/examples/02_Owin_Web_Simple)
- [OWIN Web site + remote](//github.com/guryanovev/CrystalQuartz/tree/master/examples/03_Owin_Web_Remote)

