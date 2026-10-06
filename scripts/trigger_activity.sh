#!/usr/bin/env bash
# Foydalanish: ./scripts/trigger_activity.sh [commitlar_soni]
# Misol: ./scripts/trigger_activity.sh 3

COUNT=${1:-1}
echo "🚀 $COUNT ta faollik commitlari yaratilmoqda..."

for i in $(seq 1 $COUNT); do
  TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%SZ")
  echo "Manual fast-track activity [$i/$COUNT]: $TIMESTAMP" >> .github/activity.log
  git add .github/activity.log
  git commit -m "chore(activity): fast-track activity ping ($TIMESTAMP) [skip ci]"
done

echo "✅ $COUNT ta commit yaratildi. Push qilish uchun:"
echo "git push origin main"
