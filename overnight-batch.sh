#!/bin/bash
# 夜間バッチ実行スクリプト
# 使い方: chmod +x overnight-batch.sh && ./overnight-batch.sh
#
# タスクA: テクニカルデモ7個作成
# タスクB: Git + デプロイ + ショーケース + デバッグ準備

LOGDIR=~/.overnight-logs
mkdir -p "$LOGDIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "===== 夜間バッチ開始: $(date) ====="

# --- タスクA: テクニカルデモ ---
echo ""
echo "[$(date +%H:%M:%S)] タスクA: テクニカルデモ作成 開始"
cat ~/claude-code-all-tech-demos.md | claude -p \
  > "$LOGDIR/taskA_tech_demos_$TIMESTAMP.log" 2>&1
echo "[$(date +%H:%M:%S)] タスクA: 完了 (exit: $?)"

# --- タスクB: 追加作業4件 ---
echo ""
echo "[$(date +%H:%M:%S)] タスクB: 追加作業 開始"
cat ~/claude-code-overnight-extra-tasks.md | claude -p \
  > "$LOGDIR/taskB_extra_tasks_$TIMESTAMP.log" 2>&1
echo "[$(date +%H:%M:%S)] タスクB: 完了 (exit: $?)"

echo ""
echo "===== 全バッチ完了: $(date) ====="
echo "ログ: $LOGDIR/"
echo ""
echo "--- タスクA 末尾 ---"
tail -30 "$LOGDIR/taskA_tech_demos_$TIMESTAMP.log"
echo ""
echo "--- タスクB 末尾 ---"
tail -30 "$LOGDIR/taskB_extra_tasks_$TIMESTAMP.log"
