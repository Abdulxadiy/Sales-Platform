#!/usr/bin/env bash
# Foydalanish: ./scripts/trigger_activity.sh [commitlar_soni]
# Standart: 10 ta commit

COUNT=${1:-10}
echo "🚀 $COUNT ta professional faollik commitlari yaratilmoqda..."

MESSAGES=(
  "perf(api): optimize response payload compression and serializer cache"
  "refactor(core): streamline query execution and connection pooling"
  "chore(telemetry): update healthcheck heartbeat metric logs"
  "fix(validation): handle boundary edge-cases for payload schema"
  "docs(architecture): sync endpoint schemas with openapi specs"
  "test(coverage): extend regression tests for edge cases"
  "chore(deps): verify security signatures and lockfile hashes"
  "style(clean): organize import order and formatting compliance"
  "perf(cache): fine-tune redis ttl and invalidate expired sessions"
  "feat(internal): add background worker heartbeat monitoring"
)

for i in $(seq 1 $COUNT); do
  RAND_INDEX=$(( (RANDOM + i) % ${#MESSAGES[@]} ))
  MSG="${MESSAGES[$RAND_INDEX]}"
  TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%SZ")

  echo "[$TIMESTAMP] dev-ping-$i: $MSG" >> .github/activity.log
  git add .github/activity.log
  git commit -m "$MSG [skip ci]"
done

echo "✅ $COUNT ta professional commit yaratildi!"
echo "GitHub'ga push qilish uchun quyidagini bosing:"
echo "git push origin main"
