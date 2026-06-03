# LeoOS — Full Project Context

## What this is
A personal PWA (Progressive Web App) built for iOS Safari, installed on iPhone home screen. It's a personal operating system / life tracker built from scratch. Hosted on Vercel, code on GitHub, database on Supabase.

## Infrastructure
- **GitHub**: https://github.com/MasterAzaroth/my-os
- **Vercel**: https://my-os-bay.vercel.app
- **Supabase URL**: https://dcchjwowwdkpdyxaopic.supabase.co
- **Supabase Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjY2hqd293d2RrcGR5eGFvcGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDM0NzUsImV4cCI6MjA5NTgxOTQ3NX0.FxozE-chmtrJcsZSiu4WYwn-GsrqYOQzgDA0pqPQbGc
- **Supabase Storage Bucket**: product-images (public)
- **Single file app**: index.html (~3071 lines)

## Deployment workflow
1. Edit index.html locally at C:\Users\leona\Desktop\Files\LeoOS\my-os\index.html
2. git add index.html
3. git commit -m "message"
4. git push
Vercel auto-deploys on push. No build step needed.

## CRITICAL: Always build for iOS Safari iPhone. Never think desktop/PC.
- Touch events, not mouse events
- -webkit-overflow-scrolling:touch for scrollable areas
- position:fixed works differently on iOS — use with care
- Overlays/sheets use class toggle (.open) not display:none/flex inline
- All overlays are static HTML, never dynamically created via JS

## Tech Stack
- Vanilla HTML/CSS/JS — no frameworks
- Supabase JS via fetch (not SDK) — direct REST API calls
- ZXing barcode scanning library (CDN)
- DM Sans + DM Serif Display fonts (Google Fonts)

## Design System
```css
--bg: #080808      /* main background */
--bg2: #111111     /* card background */
--bg3: #181818     /* elevated elements */
--border: #1f1f1f  /* subtle borders */
--border2: #2a2a2a /* stronger borders */
--text: #e8e6e0    /* primary text */
--text2: #888880   /* secondary text */
--text3: #444440   /* muted text */
--accent: #c8b89a  /* gold/warm accent */
--accent2: #8a7a64 /* darker accent */
--green: #4a7c59
--yellow: #8a7a40
--red: #7a3a3a
--sans: 'DM Sans'
--serif: 'DM Serif Display'
```

## Supabase Database Tables

### products
- id, created_at, name, brand, category, subcategory, description, personal_notes, ingredients, rating, cover_image_url, barcode, concentration, scent_family, top_notes, heart_notes, base_notes, longevity, sillage, season[], occasion[], gender_impression

### routine_tasks
- id, created_at, name, time_of_day (Morning/Evening), frequency (Daily/Weekly/Monthly), days[], order, notes, insertion_note

### daily_log
- id, created_at, date, step_name, time_of_day, status (Done/Skipped/Pending), order, product_used (uuid ref products), notes

### product_lists
- id, name, icon, is_default, sort_order
- Default lists: My Kit 🧴, Archive 📦, Wishlist ⭐, Saved 🔖

### product_list_items
- id, list_id, product_id (unique pair)

### product_prices
- id, product_id, source_name, price, url, currency, size_amount, size_unit, pack_amount, ml_per_piece, g_per_piece

### kit_items
- id, product_id, state (Active/Backup/Passive), container_size, container_unit, current_amount, opened_date, added_date, body_areas[], notes, price_paid, purchased_from, ml_per_piece, g_per_piece, piece_amount, piece_unit

### kit_item_steps
- id, kit_item_id, routine_task_id, time_of_day

### product_cycles
- id, product_id, container_size, container_unit, first_use_date, empty_date, total_days, total_uses, days_per_ml, ml_per_use

## App Structure — 5 nav tabs
1. 🪞 Self Care (left)
2. ◈ Library
3. ⌂ Home (center)
4. 🧴 Kit
5. ✦ Explore (placeholder)

## Self Care Tab
- Auto-detects AM/PM (3am-3pm = Morning)
- Day navigation with ← → arrows
- TODAY: interactive checklist, Save button (activates on change, upserts)
- PAST with log: read-only view of what was logged
- PAST no log: shows full routine marked as not completed (red ✕)
- FUTURE: preview of what routine will look like
- Steps loaded from routine_tasks filtered by time_of_day + days array
- Weekly steps show on their day, Monthly on 1st of month
- Save button: deletes today's session entries then re-inserts

## Routine Steps (in DB)
### Daily AM (20 steps, order 10-200)
Shower Body, Tongue Scraping, Brush Teeth, Mouthwash, Body Moisturizer, Face Cleansing, Hydrating Toner, Niacinamide Serum, Eye Cream, Face Moisturizing, Face Sunblock, Lip Balm, Lips Sunblock, Beard Oil, Minoxidil, Brush Eyebrows, Curl Eyelashes, Body Sunblock, Hand Cream, Supplements (Zinc, Biotin)

### Daily PM (19 steps, order 10-190)
Shower Body, Foot Wash, Tongue Scraping, Brush Teeth, Mouthwash, Bio Oil, Body Moisturizer, Foot Cream, Face Cleansing, Hydrating Toner, Niacinamide Serum, Eye Cream, Lash Serum, Brow Serum, Face Moisturizing, Peptide Lip Serum, Lip Balm, Hand Cream, Cuticle Oil

### Weekly additions (by day)
- Mon AM: Neti Pot (1), Ear Drops (2)
- Mon PM: Retinol (115)
- Tue PM: Exfoliating Body Scrub (11), Pore/Blackhead Strips (85), Clay Mask (88), Exfoliating Toner AHA/BHA (105)
- Wed AM: Neti Pot (1), Beard Wash (11), Beard Conditioner (12), Castor Oil (145)
- Wed PM: Coconut Oil (155)
- Thu PM: Exfoliating Body Scrub (11), Hydrating Sheet Mask (125), Retinol (115)
- Sat AM: Neti Pot (1), Beard Wash (11), Beard Conditioner (12), Castor Oil (145), + Facial Hair Grooming tools (195-199)
- Sat PM: Hydrating Sheet Mask (125), Eye Pads (115)
- Sun PM: Exfoliating Body Scrub (11), Foot Soak (12), Pumice Stone (13), Scalp Oil (14), Tea Tree Oil (15), Derma Rolling (95), Lip Scrub (158), Lip Mask (165), Hand Scrub (188), Hand Mask (192)

### Monthly (show on 1st)
- PM: Hair Removal Cream (201), Comedone Extractor Tool (202)
- AM: Clarifying Shampoo (16)

## Library Tab
- Full product catalog — meta info only, no ownership data
- Search, filter by list, filter by category, sort
- Gallery: 3-column grid, 3:4 aspect ratio cards
- Product images stored in Supabase Storage (product-images bucket)
- Images display with transparent background support
- Barcode scanner (ZXing) — checks local DB first, then Open Beauty Facts, Open Food Facts, UPC Item DB
- Compare mode — select 2 products, side by side comparison
- Custom subcategories stored in localStorage

## Product Detail Page (bottom sheet)
- Hero: 155px square image (top-left) + name/brand/category (right)
- Full-width 5-star rating row (2 rows of 5) below hero
- Sections: Lists, Add to Kit button + kit instances, Description, Personal Notes (editable, saves on blur), Where to Buy, Fragrance Profile (if Fragrance category), Ingredients
- Edit + Delete buttons top-left of sheet

## Add Product Form (4 steps, 5 for Fragrance)
Step 1: Barcode (+ camera scan), Name*, Brand*, Category*
Step 2: Subcategory (+ custom), Description, Ingredients
Step 3: Product Image (uploaded to Supabase Storage)
Step 4: Pricing (retailer, price, URL, pack amount, size per item)
Step 5 (Fragrance only): concentration, scent family, notes, longevity, sillage, season, occasion, character

## Add to Kit Flow (bottom sheet)
- If product has prices: first asks "Did you purchase this?" with source buttons
- Selecting a source prefills container size + price paid
- Fields: State (Active🟢/Backup📦/Passive💤), Container size + unit (ml/g/pcs), How much left (slider — grayed/centered when empty, activates on size entry), Price paid + where, Body areas (multi-select), Routine steps (Morning/Evening buttons → step picker overlay), Opened date

## Step Picker
- Two overlays: stepPickerOverlay (static HTML, uses kit-flow-overlay CSS class)
- Opens with .open class, closes removing .open class
- Steps deduplicated by name

## Kit Tab
- Shows owned products (status=Owned or in My Kit list)
- 3-column grid same as Library

## Home Tab
- Greeting, date, day
- Low stock / empty stock alerts
- 6 pillar cards (Self Care active, others "coming soon")

## Categories
🪥 Self Care, 🌸 Fragrance, 💊 Supplement, 🏃 Movement & Exercise, 🔧 Tool & Appliance

## Body Areas (kit flow only)
🦱 Hair, 🫧 Face, 🧔 Facial Hair, 👄 Lips, 🦷 Oral, 🫁 Body, 🪒 Body Hair, 🤲 Hands, 💅 Nails, 🦶 Feet

## 6 Pillars (for future build)
1. 🏋️ Fitness — mobility, flexibility, endurance, combat sport
2. 🧘 Mindfulness — journaling, meditation, yoga, reading
3. 🪞 Self Care — BUILT (current focus)
4. 🎵 Music — singing, guitar, piano, FL Studio
5. 🎨 Creative Peripherals — dance, drawing, culinary arts
6. 💻 Personal Projects — app development, planning

## Known issues / TODO
- Step picker scroll behavior on iOS needs fixing (current task)
- Kit tab needs to show kit_items data (amount remaining, state etc.)
- Analytics/dashboard not yet built
- Journals system not yet built
- Weekly review not yet built
- Progress journal not yet built
- Other 5 pillars not yet built
- Custom subcategory management (edit/delete) not yet built

## User profile
- Name: Léonard
- Location: Munich, Germany
- Background: Wirtschaftsinformatik — comfortable with tech, can read code but doesn't write it
- Uses app exclusively on iPhone (iOS Safari PWA)
- Design preference: dark, minimal, clean, app-like (not "Notion-looking")
