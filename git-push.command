#!/bin/bash
# Overcast Gaming — commit & push script
# Double-click this file to run it in Terminal

cd "$(dirname "$0")"

echo "🔧 Cleaning up git lock if present..."
rm -f .git/index.lock

echo "👤 Configuring git..."
git config user.email "conner@mcmurphyhq.com"
git config user.name "Conner McMurphy"

echo "📦 Staging all files..."
git add -A

echo "✅ Committing..."
git commit -m "feat: add community news feed page and fix mobile navigation

- Add public/community.html — 'The War Room' community feed with 9 seed posts,
  category filter tabs (News, Battle Reports, Events, Discussion, Painting),
  honour/comment/fire reactions, pinned announcements, and a sidebar with
  upcoming events, top contributors, and league resources
- Add mobile hamburger menu to all pages (visible at ≤480px) with open/close
  toggle replacing the hidden nav links
- Add Community nav link to all pages (index, roster, stats, admin, community)
- Add /community route to server.js"

echo "🚀 Pushing to GitHub..."
git push -u origin master

echo ""
echo "✅ Done! Check https://github.com/mcsporkt654/overcast-gaming"
echo ""
read -p "Press Enter to close..."
