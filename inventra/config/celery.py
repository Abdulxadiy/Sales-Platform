import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('inventra')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'auto-expire-b2b-transfers-hourly': {
        'task': 'apps.sales.tasks.auto_expire_transfers_task',
        'schedule': crontab(minute=0),
    },
    'check-and-send-daily-reports-periodic': {
        'task': 'apps.cashbox.tasks.check_and_send_daily_reports_task',
        'schedule': crontab(minute='*/5'),
    },
}
