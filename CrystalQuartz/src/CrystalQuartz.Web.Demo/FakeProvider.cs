using CrystalQuartz.Core.Contracts;
using CrystalQuartz.Core.SchedulerProviders;
using Quartz.Impl;

namespace CrystalQuartz.Web.Demo
{
    using Quartz;
    using Quartz.Collection;
    using System.Collections.Specialized;

    public class FakeProvider : ISchedulerProvider
    {
        /// <summary>
        /// ����������
        /// </summary>
        /// <param name="engine"></param>
        /// <returns></returns>
        public object CreateScheduler(ISchedulerEngine engine)
        {
            //����
            NameValueCollection properties = new NameValueCollection();
            properties.Add("test1", "test1value");
            properties.Add("quartz.scheduler.instanceName", "xxxue ��quartz");
            properties.Add("quartz.scheduler.instanceId", "test|pipe");
          
            //ʵ���� ������
            var scheduler = new StdSchedulerFactory(properties)?.GetScheduler();

            /*
             ���job�봥�����ļ��ָ�ʽ
             */

            #region job1

            // ���� job
            var jobDetail = JobBuilder.Create<HelloJob>()
                .WithIdentity("myJob") //job Ψһ����
                .StoreDurably() //�־ô���
                .Build();

            // ���1����ִ��
            var trigger = TriggerBuilder.Create()
                .WithIdentity("myTrigger") //������ Ψһ����
                .StartNow() //������ʼ
                .WithSimpleSchedule(x => x.WithIntervalInMinutes(1).RepeatForever()) //�򵥵���: ���һ���� (RepeatForever �ظ� ��Զ :ָ�����������������ظ���)
                .Build(); //�������������

            scheduler.ScheduleJob(jobDetail, trigger);//���� job�봥����

            #endregion job1

            #region job2

            // construct job info
            var jobDetail2 = JobBuilder.Create<HelloJob>()
                .WithIdentity("myJob2")
                .Build();

            // fire every 3 minutes
            var trigger2 = TriggerBuilder.Create()
                .WithIdentity("myTrigger2")
                .StartNow()
                .WithSimpleSchedule(x => x.WithIntervalInMinutes(3))
                .Build();

            scheduler.ScheduleJob(jobDetail2, trigger2);

            var trigger3 = TriggerBuilder.Create()
               .WithIdentity("myTrigger3")
               .ForJob(jobDetail2) //ָ�� ��Ӧ�� job
               .StartNow()
               .WithSimpleSchedule(x => x.WithIntervalInSeconds(40).RepeatForever())
               //.WithSimpleSchedule(x => x.WithIntervalInMinutes(5).RepeatForever())
               .Build();

            scheduler.ScheduleJob(trigger3);

            #endregion job2

            #region job4

            // construct job info
            var jobDetail4 = JobBuilder.Create<HelloJob>()
                .WithIdentity("myJob4", "MyOwnGroup")
                .Build();

            jobDetail4.JobDataMap.Add("key1", "value1");
            jobDetail4.JobDataMap.Add("key2", "value2");
            jobDetail4.JobDataMap.Add("key3", 1L);
            jobDetail4.JobDataMap.Add("key4", 1d);
            jobDetail4.JobDataMap.Add("key5", new { FisrtName = "John", LastName = "Smith" });
            jobDetail4.JobDataMap.Add("key6", new[]
            {
                new { Name = "test1" },
                new { Name = "test2" }
            });

            // fire every hour
            ITrigger trigger4 = TriggerBuilder.Create()
                .WithIdentity("myTrigger4", jobDetail4.Key.Group)
                .StartNow()
                .WithSimpleSchedule(x => x.WithIntervalInMinutes(1))
                .Build();

            ITrigger trigger5 = TriggerBuilder.Create()
                .WithIdentity("myTrigger5", jobDetail4.Key.Group)
                .StartNow()
                .WithCronSchedule("0 0/5 * * * ?") //Cron ����
                .Build();

            // job , ������, ������ͬ���Ƿ� �滻 ����Ѵ���  ���� Replact = false  �� �׳��쳣
            scheduler.ScheduleJob(jobDetail4, new HashSet<ITrigger>(new[] { trigger4, trigger5 }), false);
            //scheduler.ScheduleJob(jobDetail4, trigger5);

            #endregion job4

            //��ͣ job
            scheduler.PauseJob(new JobKey("myJob4", "MyOwnGroup"));
            //��ͣ ������
            scheduler.PauseTrigger(new TriggerKey("myTrigger3", "DEFAULT"));

            //��������ʼ
            scheduler.Start();

            return scheduler;
        }
    }
}