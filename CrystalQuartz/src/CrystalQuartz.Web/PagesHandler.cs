namespace CrystalQuartz.Web
{
    using System.Web;
    using CrystalQuartz.Application;
    using CrystalQuartz.Application.Startup;
    using CrystalQuartz.Core.SchedulerProviders;
    using CrystalQuartz.WebFramework;
    using CrystalQuartz.WebFramework.SystemWeb;

    /// <summary>
    /// ҳ��  �������
    /// </summary>
    public class PagesHandler : IHttpHandler
    {
        private static readonly RunningApplication RunningApplication;

        /// <summary>
        /// ��̬����
        /// </summary>
        static PagesHandler()
        {
            var options = new CrystalQuartzOptions
            {
                //css��ַ
                CustomCssUrl = Configuration.ConfigUtils.CustomCssUrl
            };

            //������
            ISchedulerProvider schedulerProvider = Configuration.ConfigUtils.SchedulerProvider;

            //��ʼ�� Ӧ�ó���
            Application application = new CrystalQuartzPanelApplication(
                schedulerProvider,
                options.ToRuntimeOptions(SchedulerEngineProviders.SchedulerEngineResolvers, FrameworkVersion.Value));

            //����
            RunningApplication = application.Run();
        }

        public void ProcessRequest(HttpContext context)
        {
            RunningApplication.Handle(
                new SystemWebRequest(context),
                new SystemWebResponseRenderer(context));
        }

        public virtual bool IsReusable
        {
            get { return false; }
        }
    }
}