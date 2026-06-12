#!/bin/bash
FILES=(
  "supabase/functions/rewrite-essay/index.ts"
  "supabase/functions/generate-infographic-steps/index.ts"
  "supabase/functions/generate-simulator-questions/index.ts"
  "supabase/functions/generate-question/index.ts"
  "supabase/functions/pisa-intervention-plan/index.ts"
  "supabase/functions/pausa-pedagogica/index.ts"
  "supabase/functions/escuta-ativa/index.ts"
  "supabase/functions/pedagogical-insights/index.ts"
  "supabase/functions/generate-podcast-summary/index.ts"
  "supabase/functions/mat-chat/index.ts"
  "supabase/functions/generate-pisa-questions/index.ts"
  "supabase/functions/generate-slides/index.ts"
  "supabase/functions/correct-essay-text/index.ts"
  "supabase/functions/generate-exercise-list/index.ts"
  "supabase/functions/generate-essay/index.ts"
  "supabase/functions/pisa-feedback/index.ts"
  "supabase/functions/generate-lesson-plan/index.ts"
  "supabase/functions/generate-mind-map/index.ts"
  "supabase/functions/export-kahoot/index.ts"
  "supabase/functions/edu-studio-ai/index.ts"
)

for file in "${FILES[@]}"; do
  echo "Processing $file"
  # 1. Trocar URL
  sed -i 's|https://ai.gateway.lovable.dev/v1/chat/completions|https://generativelanguage.googleapis.com/v1beta/openai/chat/completions|g' "$file"
  
  # 2. Trocar API KEY
  sed -i 's/LOVABLE_API_KEY/GEMINI_API_KEY/g' "$file"
  
  # 3. Model updates
  sed -i 's/"google\/gemini-3-flash-preview"/"gemini-2.5-flash"/g' "$file"
  sed -i 's/"google\/gemini-2.5-flash-lite"/"gemini-2.5-flash-lite"/g' "$file"
done
