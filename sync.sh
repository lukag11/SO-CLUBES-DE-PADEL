#!/bin/bash

REMOTE="origin"
BRANCH="main"

echo ""
echo "======================================="
echo "   SO CLUBES DE PADEL — Sync Check"
echo "======================================="
echo ""

# Fetch silencioso
git fetch $REMOTE 2>/dev/null

LOCAL=$(git rev-parse HEAD)
REMOTE_HEAD=$(git rev-parse $REMOTE/$BRANCH)
BASE=$(git merge-base HEAD $REMOTE/$BRANCH)

# Cambios locales sin commitear
DIRTY=$(git status --porcelain)

if [ -n "$DIRTY" ]; then
  echo "⚠️  CAMBIOS SIN COMMITEAR:"
  git status --short
  echo ""
fi

if [ "$LOCAL" = "$REMOTE_HEAD" ]; then
  echo "✅ Estás al día con el remoto."
elif [ "$LOCAL" = "$BASE" ]; then
  BEHIND=$(git rev-list HEAD..$REMOTE/$BRANCH --count)
  echo "⬇️  ESTÁS DESACTUALIZADO — $BEHIND commit(s) nuevos en el remoto."
  echo ""
  echo "   Corré esto antes de trabajar:"
  echo "   git pull origin $BRANCH"
elif [ "$REMOTE_HEAD" = "$BASE" ]; then
  AHEAD=$(git rev-list $REMOTE/$BRANCH..HEAD --count)
  echo "⬆️  Tenés $AHEAD commit(s) locales sin pushear."
  echo ""
  echo "   Cuando estés listo:"
  echo "   git push origin $BRANCH"
else
  AHEAD=$(git rev-list $REMOTE/$BRANCH..HEAD --count)
  BEHIND=$(git rev-list HEAD..$REMOTE/$BRANCH --count)
  echo "⚠️  DIVERGENCIA — $AHEAD commit(s) locales y $BEHIND commit(s) remotos."
  echo ""
  echo "   Hay cambios en ambos lados. Resolvé así:"
  echo "   git pull origin $BRANCH   (resolvé conflictos si los hay)"
  echo "   git push origin $BRANCH"
fi

echo ""
echo "======================================="
echo ""
