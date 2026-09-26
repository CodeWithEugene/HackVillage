# Public-page image refresh

Generated with the built-in image_gen tool on 2026-09-26. All 34 replacement photographs feature Black Kenyan adults and are editorial marketing illustrations. Exported as WebP (quality 85) with responsive delivery through Next.js Image. The seven approved landing collage photographs and their component remain unchanged.

## Slot dimensions

Measured in Chromium at 1440×1000 desktop and 390×1000 mobile viewports. Responsive slots vary with viewport width; the export dimensions provide higher-resolution source assets.

| Section | Desktop rendered size | Mobile rendered size | Export size / composition |
| --- | --- | --- | --- |
| Builder journey side pills ×4 | 184×312 | 173×293 | 960×1600; centered face and activity, rounded-crop headroom |
| Builder journey winner | 374×640 | 322×551 | 960×1600; trophy and laptop within narrow portrait |
| How It Works cards ×4 | 322×403 | 358×448 | 1024×1280; 4:5, faces above caption |
| Trust main arch | 362×509 | 217×305 | 960×1280; centered organizer |
| Trust strip ×3 | 158×207 | 111×146 | 960×1280; deposit, payout, transaction review |
| Newsletter CTA | 677×480 | 358×201 | 1600×1120; safe for 16:9 mobile crop |
| Authentication background | 736×1000 | Hidden by existing layout | 1200×1600; quiet top/bottom for overlays |
| Blog cards / related articles | 438×188 | 358×153 | 2100×900; 21:9 |
| Blog article cover | 1354×580 | 358×153 | 2100×900; 21:9 |
| Hackathon cards | 438×188 | 358×153 | 1600×900; top-aligned 21:9 card crop |
| Hackathon detail cover | 400×225 | 358×201 | 1600×900; 16:9 |

## Coverage

- Home: approved hero retained; all other photographic slots replaced.
- How It Works: four process photographs and shared newsletter photograph replaced. Fresh `/marketing/process/` URLs avoid stale optimized-image caches.
- Blog: both index pages, all nine articles, and related-article cards use topic-specific wide covers.
- Hackathons: all ten category defaults, existing legacy seeded covers, future seed records, and detail covers use the new category photography. Explicit uploaded covers retain precedence. Legacy stock paths are matched exactly; no database changes are needed.
- Authentication: shared sign-in, signup, recovery, verification, invite, and onboarding layout uses the new background where rendered.
- Escrow explainer, contribution guide, privacy, terms, unsubscribe pages, and developer profiles have no editorial photo slots to replace. Brand/partner logos, icons, and original uploaded event evidence are not synthetic marketing assets.

## Files and exact generation prompts

Each prompt produced one new photograph with no reference image. Encoding and dimension normalization used Sharp after generation. These are the final selected prompts; scene descriptions are illustrative, not claims about real participants or payments.

### process/launch

- File: `public/marketing/process/launch.webp`
- Export: 1024×1280

Use case: photorealistic-natural. Create ONE finished portrait editorial photograph for HackVillage's 'The Prize Is Already There' how-it-works card. Output 1024x1280, 4:5. Two Black Kenyan hackathon organizers, a woman and man in their late twenties, seated close together reviewing event planning and a prize budget on a laptop in a contemporary Nairobi coworking office. One holds a phone as the other checks the laptop; believable calm concentration, not posing. Natural daylight, authentic skin texture, stylish navy and warm neutral clothing. Place both faces in upper third with generous margin above heads; laptop and tabletop occupy lower half that will sit behind a dark caption. Subjects centered and close enough to survive narrow crop. No text, logos, watermarks, giant cheques, floating icons, fake UI, or extra limbs. Documentary photography, realistic anatomy, polished but candid.

### process/build

- File: `public/marketing/process/build.webp`
- Export: 1024×1280

Use case: photorealistic-natural. ONE editorial documentary photograph for a HackVillage how-it-works card. Portrait 4:5, requested 1024x1280. Contemporary Nairobi tech event, all people Black Kenyan adults, authentic skin texture, natural daylight, navy/blue/neutral casual clothes. Faces and the main activity in upper 45%, generous headroom, lower half is table/equipment space behind a dark website caption. No visible writing, logos, watermarks, floating graphics, oversized cheques, or anatomically incorrect hands. Three developers, two women and one man, seated close together pair programming and sketching a simple app wireframe beside two laptops. Engaged discussion, one woman types as teammates watch, candid working moment. Frame the trio tightly enough to read clearly in a narrow card.

### process/judge

- File: `public/marketing/process/judge.webp`
- Export: 1024×1280

Use case: photorealistic-natural. ONE editorial documentary photograph for a HackVillage how-it-works card. Portrait 4:5, requested 1024x1280. Contemporary Nairobi tech event, all people Black Kenyan adults, authentic skin texture, natural daylight, navy/blue/neutral casual clothes. Faces and the main activity in upper 45%, generous headroom, lower half is table/equipment space behind a dark website caption. No visible writing, logos, watermarks, floating graphics, oversized cheques, or anatomically incorrect hands. A woman hackathon judge with short natural hair reviewing a young man's laptop demo at a small table. Another woman judge listening beside her, holding a clipboard. The judge points towards the prototype while discussing it constructively; fair technical review, attentive expressions. Keep faces at matching height in upper third.

### process/reward

- File: `public/marketing/process/reward.webp`
- Export: 1024×1280

Use case: photorealistic-natural. ONE editorial documentary photograph for a HackVillage how-it-works card. Portrait 4:5, requested 1024x1280. Contemporary Nairobi tech event, all people Black Kenyan adults, authentic skin texture, natural daylight, navy/blue/neutral casual clothes. Faces and the main activity in upper 45%, generous headroom, lower half is table/equipment space behind a dark website caption. No visible writing, logos, watermarks, floating graphics, oversized cheques, or anatomically incorrect hands. Two winning software developers, a woman with locs and a man with close cropped hair, smiling together at a small gold trophy on the table while the woman checks her phone for their prize payout. Both seated, shoulders close, candid relief and joy after the hackathon. Faces upper third, trophy and phone near the middle, laptop and table lower half.

### journey/build

- File: `public/marketing/journey/build.webp`
- Export: 960×1600

Use case: photorealistic-natural. Generate ONE new editorial portrait photograph, vertical 3:5, 960x1600 requested. For HackVillage builder journey section, displayed in a tall narrow pill crop with rounded top/bottom. Contemporary Nairobi tech workspace. Black Kenyan adults, authentic varied skin texture, natural light, candid expressions, believable anatomy, no text/logos/watermark. Keep main face centered at 35% from top, entire head and shoulders safely within central 60% width, activity mid-frame, ample headroom for rounded crop. A young woman software engineer with natural short hair, in a slate blue shirt, sitting at a laptop debugging her project, side-three-quarter view. Focus and determination, green plant and warm window light behind her. Medium shot showing face and typing hands.

### journey/ship

- File: `public/marketing/journey/ship.webp`
- Export: 960×1600

Use case: photorealistic-natural. Generate ONE new editorial portrait photograph, vertical 3:5, 960x1600 requested. For HackVillage builder journey section, displayed in a tall narrow pill crop with rounded top/bottom. Contemporary Nairobi tech workspace. Black Kenyan adults, authentic varied skin texture, natural light, candid expressions, believable anatomy, no text/logos/watermark. Keep main face centered at 35% from top, entire head and shoulders safely within central 60% width, activity mid-frame, ample headroom for rounded crop. A young male developer in an olive overshirt presenting his completed mobile app on a phone, glancing towards a colleague just outside frame. Seated at his laptop, calm pride in a finished prototype. Clean modern office, shallow depth of field. No legible interface text.

### journey/win

- File: `public/marketing/journey/win.webp`
- Export: 960×1600

Use case: photorealistic-natural. Generate ONE new editorial portrait photograph, vertical 3:5, 960x1600 requested. For HackVillage builder journey section, displayed in a tall narrow pill crop with rounded top/bottom. Contemporary Nairobi tech workspace. Black Kenyan adults, authentic varied skin texture, natural light, candid expressions, believable anatomy, no text/logos/watermark. Keep main face centered at 35% from top, entire head and shoulders safely within central 60% width, activity mid-frame, ample headroom for rounded crop. A joyful Black Kenyan woman developer with shoulder-length twists, wearing a cobalt shirt and dark trousers, standing in a bright hackathon venue holding a modest gold trophy in one hand and closed silver laptop tucked under other arm. Knees-up portrait, centered, relaxed celebratory smile, softly blurred Black teammates behind. Trophy, face and laptop completely within central 60% width, plenty of room above head.

### journey/paid

- File: `public/marketing/journey/paid.webp`
- Export: 960×1600

Use case: photorealistic-natural. Generate ONE new editorial portrait photograph, vertical 3:5, 960x1600 requested. For HackVillage builder journey section, displayed in a tall narrow pill crop with rounded top/bottom. Contemporary Nairobi tech workspace. Black Kenyan adults, authentic varied skin texture, natural light, candid expressions, believable anatomy, no text/logos/watermark. Keep main face centered at 35% from top, entire head and shoulders safely within central 60% width, activity mid-frame, ample headroom for rounded crop. A young Black Kenyan male software engineer seated beside his open laptop, checking a payout notification on his phone with an understated happy smile. Navy casual shirt, soft light. Phone screen facing him, no visible text or interface, face and phone centered and fully visible.

### journey/hired

- File: `public/marketing/journey/hired.webp`
- Export: 960×1600

Use case: photorealistic-natural. Generate ONE new editorial portrait photograph, vertical 3:5, 960x1600 requested. For HackVillage builder journey section, displayed in a tall narrow pill crop with rounded top/bottom. Contemporary Nairobi tech workspace. Black Kenyan adults, authentic varied skin texture, natural light, candid expressions, believable anatomy, no text/logos/watermark. Keep main face centered at 35% from top, entire head and shoulders safely within central 60% width, activity mid-frame, ample headroom for rounded crop. A Black Kenyan woman engineer in a light beige jacket explaining her laptop portfolio to a hiring manager whose shoulder is softly blurred in the foreground. The engineer is central and in sharp focus, warm confident eye contact with interviewer, slim laptop in lower frame, welcoming Nairobi coworking meeting room.

### trust/escrow

- File: `public/marketing/trust/escrow.webp`
- Export: 960×1280

Use case: photorealistic-natural. ONE finished editorial photograph for HackVillage escrow and payouts section. Portrait 3:4, requested 960x1280. Contemporary Nairobi office, all people Black Kenyan adults. Authentic texture and natural daylight, candid documentary realism. Safe centered composition, face(s) around upper third with headroom for rounded crop, central action visible even in small thumbnail. No text, logos, watermarks, stylized overlay graphics, physical piles of money, or fake security symbolism. An experienced Black Kenyan woman event organizer with short natural hair in a navy blazer, seated at a neat desk reviewing the hackathon prize funding on her laptop with a smartphone beside it. Thoughtful focused expression, believable responsible organizer handling budget, green plants, warm concrete and wood office details. Medium shot; no one else prominent. Keep face and laptop centered.

### trust/deposit

- File: `public/marketing/trust/deposit.webp`
- Export: 960×1280

Use case: photorealistic-natural. ONE finished editorial photograph for HackVillage escrow and payouts section. Portrait 3:4, requested 960x1280. Contemporary Nairobi office, all people Black Kenyan adults. Authentic texture and natural daylight, candid documentary realism. Safe centered composition, face(s) around upper third with headroom for rounded crop, central action visible even in small thumbnail. No text, logos, watermarks, stylized overlay graphics, physical piles of money, or fake security symbolism. A Black Kenyan male hackathon organizer in a pale blue shirt making the prize-pool deposit on a phone while seated beside an open laptop. Side three quarter medium portrait, concentrated expression, phone held at mid-chest, screen turned away from camera.

### trust/payout

- File: `public/marketing/trust/payout.webp`
- Export: 960×1280

Use case: photorealistic-natural. ONE finished editorial photograph for HackVillage escrow and payouts section. Portrait 3:4, requested 960x1280. Contemporary Nairobi office, all people Black Kenyan adults. Authentic texture and natural daylight, candid documentary realism. Safe centered composition, face(s) around upper third with headroom for rounded crop, central action visible even in small thumbnail. No text, logos, watermarks, stylized overlay graphics, physical piles of money, or fake security symbolism. A Black Kenyan woman developer with braids checking her smartphone beside a closed laptop, smiling with relief after receiving her hackathon prize. Casual deep green shirt, seated in a bright coworking lounge, medium portrait with face and phone safely centered.

### trust/record

- File: `public/marketing/trust/record.webp`
- Export: 960×1280

Use case: photorealistic-natural. ONE finished editorial photograph for HackVillage escrow and payouts section. Portrait 3:4, requested 960x1280. Contemporary Nairobi office, all people Black Kenyan adults. Authentic texture and natural daylight, candid documentary realism. Safe centered composition, face(s) around upper third with headroom for rounded crop, central action visible even in small thumbnail. No text, logos, watermarks, stylized overlay graphics, physical piles of money, or fake security symbolism. A Black Kenyan male software engineer with round glasses in a navy shirt checking a transaction record on his laptop, hand on trackpad and a small paper notebook beside it. Candid mid shot, attentive face visible, screen turned away from viewer, softly blurred coworking interior.

### newsletter/community

- File: `public/marketing/newsletter/community.webp`
- Export: 1600×1120

Use case: photorealistic-natural. ONE new editorial photo for HackVillage newsletter 'Stay in the loop', a community for verified hackathons and rewards. Landscape 10:7 requested 1600x1120; also cropped to 16:9 on phones. Two Black Kenyan software developers, a woman with short natural hair and a man in round glasses, discovering an upcoming tech challenge together on a laptop in an airy Nairobi coworking lounge. Candid engaged smiles, woman points to laptop, natural body language. Mid wide shot, both whole heads and shoulders inside center 70% width and middle 65% height so both landscape crops work. Soft daylight, deep blue and terracotta clothes, warm wood and leafy background. Realistic skin texture, hands, no logos, visible writing, watermark, UI overlays, or cash.

### auth/welcome

- File: `public/marketing/auth/welcome.webp`
- Export: 1200×1600

Use case: photorealistic-natural. ONE new editorial photograph for HackVillage sign in and sign up full-height background. Portrait 3:4 requested 1200x1600. Black Kenyan woman software engineer with neatly tied locs, wearing a muted blue shirt, seated at a laptop in a beautiful modern Nairobi tech hub, one other Black colleague softly out of focus in distance. Frame a medium wide environmental portrait: her face is centered horizontally and at 49% image height, her head occupies only 12% of height, laptop in lower middle. Reserve TOP 30% for quiet dark navy architectural wall and soft shadow for website white heading, bottom 20% uncluttered dark desk for overlay card. Daylight lights her face with natural skin texture, inviting atmosphere. No words, brands, watermarks, in-image graphics, or extra fingers. Must be a photograph, not a UI design.

### blog/first-hackathon

- File: `public/marketing/blog/first-hackathon.webp`
- Export: 2100×900

Use case: photorealistic-natural. ONE editorial blog cover for HackVillage. ULTRAWIDE 21:9 landscape, 2100x900 requested. All people Black Kenyan adults. Contemporary Nairobi tech environment, authentic skin texture, natural daylight, believable candid moment. Wide composition with whole faces fully inside middle vertical 65%, comfortable breathing room above heads, no cut off faces. No logos, readable text, watermark, decorative graphics, split panels, or exaggerated stock-photo poses. A friendly woman event volunteer greeting two young developers arriving at a hackathon registration desk, one carries a laptop sleeve and the other a backpack. Welcoming relaxed smiles, blurred tables and laptops in spacious venue behind. Mid-wide shot at eye level.

### blog/team

- File: `public/marketing/blog/team.webp`
- Export: 2100×900

Use case: photorealistic-natural. ONE editorial blog cover for HackVillage. ULTRAWIDE 21:9 landscape, 2100x900 requested. All people Black Kenyan adults. Contemporary Nairobi tech environment, authentic skin texture, natural daylight, believable candid moment. Wide composition with whole faces fully inside middle vertical 65%, comfortable breathing room above heads, no cut off faces. No logos, readable text, watermark, decorative graphics, split panels, or exaggerated stock-photo poses. Three software teammates, two women and one man, planning a small app release at a shared table, one draws a simple wireframe in a notebook while another types on a laptop and third listens. Communicate complementary roles and teamwork, everyone seated so all heads fit a horizontal band. Warm wooden table and understated modern office.

### blog/portfolio

- File: `public/marketing/blog/portfolio.webp`
- Export: 2100×900

Use case: photorealistic-natural. ONE editorial blog cover for HackVillage. ULTRAWIDE 21:9 landscape, 2100x900 requested. All people Black Kenyan adults. Contemporary Nairobi tech environment, authentic skin texture, natural daylight, believable candid moment. Wide composition with whole faces fully inside middle vertical 65%, comfortable breathing room above heads, no cut off faces. No logos, readable text, watermark, decorative graphics, split panels, or exaggerated stock-photo poses. A confident woman software engineer presenting her laptop project portfolio to a male hiring manager across a coworking meeting table. Two people in profile three-quarter view, eye-level, professional but casual. Hiring manager listens attentively, her open laptop and small notebook at center; warm daylight.

### blog/open-source

- File: `public/marketing/blog/open-source.webp`
- Export: 2100×900

Use case: photorealistic-natural. ONE editorial blog cover for HackVillage. ULTRAWIDE 21:9 landscape, 2100x900 requested. All people Black Kenyan adults. Contemporary Nairobi tech environment, authentic skin texture, natural daylight, believable candid moment. Wide composition with whole faces fully inside middle vertical 65%, comfortable breathing room above heads, no cut off faces. No logos, readable text, watermark, decorative graphics, split panels, or exaggerated stock-photo poses. Two open-source contributors, a woman in a blue shirt and man in muted green, doing a friendly code review side by side with two laptops and a monitor showing abstract soft unreadable lines of code. Shared concentration, notebook between them, natural tech workshop atmosphere.

### blog/media

- File: `public/marketing/blog/media.webp`
- Export: 2100×900

Use case: photorealistic-natural. ONE editorial blog cover for HackVillage. ULTRAWIDE 21:9 landscape, 2100x900 requested. All people Black Kenyan adults. Contemporary Nairobi tech environment, authentic skin texture, natural daylight, believable candid moment. Wide composition with whole faces fully inside middle vertical 65%, comfortable breathing room above heads, no cut off faces. No logos, readable text, watermark, decorative graphics, split panels, or exaggerated stock-photo poses. A woman photographer at a hackathon reviewing photos on the rear screen of her DSLR camera beside a male event coordinator sorting event pictures on a laptop. Camera and laptop clearly visible, lively but softly blurred developers behind them, candid documentation of a real tech gathering.

### blog/judging

- File: `public/marketing/blog/judging.webp`
- Export: 2100×900

Use case: photorealistic-natural. ONE editorial blog cover for HackVillage. ULTRAWIDE 21:9 landscape, requested 2100x900. Contemporary Nairobi tech workspace with blank walls and unbranded equipment. All people Black Kenyan adults. Natural skin texture and soft daylight, professional candid documentary photograph. Keep whole heads inside horizontal composition with headroom; medium-wide eye-level shot. Absolutely no text anywhere: blank walls, plain clothing, blank notebooks or indistinct marks, no posters, no slogans, no brand logos, no watermark. Two hackathon judges, an experienced woman and younger man, both seated on one side of a table reviewing a woman developer's prototype on a laptop. One judge marks a paper scorecard with simple empty grid cells, the other listens to the developer. Thoughtful fair review, heads all at similar height, laptop at center.

### blog/payouts

- File: `public/marketing/blog/payouts.webp`
- Export: 2100×900

Use case: photorealistic-natural. ONE editorial blog cover for HackVillage. ULTRAWIDE 21:9 landscape, requested 2100x900. Contemporary Nairobi tech workspace with blank walls and unbranded equipment. All people Black Kenyan adults. Natural skin texture and soft daylight, professional candid documentary photograph. Keep whole heads inside horizontal composition with headroom; medium-wide eye-level shot. Absolutely no text anywhere: blank walls, plain clothing, blank notebooks or indistinct marks, no posters, no slogans, no brand logos, no watermark. A woman hackathon winner checking her phone and smiling with her male teammate; modest gold trophy and open laptop on the table. A small quiet celebration after receiving their prize payment, no money or cheques. Keep phone, both faces and trophy visible in center horizontal band.

### blog/organizing

- File: `public/marketing/blog/organizing.webp`
- Export: 2100×900

Use case: photorealistic-natural. ONE editorial blog cover for HackVillage. ULTRAWIDE 21:9 landscape, requested 2100x900. Contemporary Nairobi tech workspace with blank walls and unbranded equipment. All people Black Kenyan adults. Natural skin texture and soft daylight, professional candid documentary photograph. Keep whole heads inside horizontal composition with headroom; medium-wide eye-level shot. Absolutely no text anywhere: blank walls, plain clothing, blank notebooks or indistinct marks, no posters, no slogans, no brand logos, no watermark. A Black Kenyan woman event organizer leading a preparation meeting with two Black teammates around a laptop and paper schedule. Wide view of a bright modern hackathon venue being readied in background, neat empty tables with laptops, organizer explaining calmly, team listening. No stage signage.

### blog/follow-up

- File: `public/marketing/blog/follow-up.webp`
- Export: 2100×900

Use case: photorealistic-natural. ONE editorial blog cover for HackVillage. ULTRAWIDE 21:9 landscape, requested 2100x900. Contemporary Nairobi tech workspace with blank walls and unbranded equipment. All people Black Kenyan adults. Natural skin texture and soft daylight, professional candid documentary photograph. Keep whole heads inside horizontal composition with headroom; medium-wide eye-level shot. Absolutely no text anywhere: blank walls, plain clothing, blank notebooks or indistinct marks, no posters, no slogans, no brand logos, no watermark. Two Black Kenyan software founders, a man and woman, checking in on their shipped hackathon project three months later. They are seated at a desk reviewing a tablet prototype together, with an open laptop and notebook nearby. Mature focused collaborative mood, comfortable small startup studio with plants, unbranded simple clothing.

### hackathons/ai

- File: `public/marketing/hackathons/ai.webp`
- Export: 1600×900

Use case: photorealistic-natural. ONE category cover photograph for HackVillage hackathons. Landscape 16:9, requested 1600x900, also displayed center-cropped to 21:9. All people Black Kenyan adults in contemporary Kenya. Keep complete faces and key equipment inside middle horizontal 60% height so crop is safe. Candid documentary photography with natural skin texture, natural daylight, realistic hands, ordinary professional clothing. Blank walls, plain clothes, no readable words, no posters, no logos, no watermarks, no floating digital overlays. Two Kenyan AI engineers, a woman and a man, testing a speech recognition prototype at a laptop with a small tabletop microphone and headphones. One speaks softly towards the microphone while the other monitors an abstract audio waveform on screen. Bright modern tech studio, practical machine learning development, no robots.

### hackathons/web3

- File: `public/marketing/hackathons/web3.webp`
- Export: 1600×900

Use case: photorealistic-natural. ONE category cover photograph for HackVillage hackathons. Landscape 16:9, requested 1600x900, also displayed center-cropped to 21:9. All people Black Kenyan adults in contemporary Kenya. Keep complete faces and key equipment inside middle horizontal 60% height so crop is safe. Candid documentary photography with natural skin texture, natural daylight, realistic hands, ordinary professional clothing. Blank walls, plain clothes, no readable words, no posters, no logos, no watermarks, no floating digital overlays. Two Kenyan blockchain developers, woman and man, at a laptop discussing a distributed application prototype. A freestanding small whiteboard beside them has a simple hand-drawn interconnected node diagram with circles and lines only, no text. Practical coding workshop atmosphere, no coins or cryptocurrency logos.

### hackathons/fintech

- File: `public/marketing/hackathons/fintech.webp`
- Export: 1600×900

Use case: photorealistic-natural. ONE category cover photograph for HackVillage hackathons. Landscape 16:9, requested 1600x900, also displayed center-cropped to 21:9. All people Black Kenyan adults in contemporary Kenya. Keep complete faces and key equipment inside middle horizontal 60% height so crop is safe. Candid documentary photography with natural skin texture, natural daylight, realistic hands, ordinary professional clothing. Blank walls, plain clothes, no readable words, no posters, no logos, no watermarks, no floating digital overlays. A Kenyan woman fintech engineer testing a mobile payment prototype on a smartphone beside a male colleague using a compact card terminal. Open laptop on the shared desk, they compare device results with focused interest. Nairobi startup office, screens angled away, no bank brands or cash.

### hackathons/health

- File: `public/marketing/hackathons/health.webp`
- Export: 1600×900

Use case: photorealistic-natural. ONE category cover photograph for HackVillage hackathons. Landscape 16:9, requested 1600x900, also displayed center-cropped to 21:9. All people Black Kenyan adults in contemporary Kenya. Keep complete faces and key equipment inside middle horizontal 60% height so crop is safe. Candid documentary photography with natural skin texture, natural daylight, realistic hands, ordinary professional clothing. Blank walls, plain clothes, no readable words, no posters, no logos, no watermarks, no floating digital overlays. A Kenyan female clinician in blue scrubs and a Kenyan male software developer in casual clothes reviewing a tablet health-record prototype together at a bright clinic office desk. Laptop nearby, neutral clinical room, no patients, no private medical details, calm collaborative expressions.

### hackathons/agritech

- File: `public/marketing/hackathons/agritech.webp`
- Export: 1600×900

Use case: photorealistic-natural. ONE category cover photograph for HackVillage hackathons. Landscape 16:9, requested 1600x900, also displayed center-cropped to 21:9. All people Black Kenyan adults in contemporary Kenya. Keep complete faces and key equipment inside middle horizontal 60% height so crop is safe. Candid documentary photography with natural skin texture, natural daylight, realistic hands, ordinary professional clothing. Blank walls, plain clothes, no readable words, no posters, no logos, no watermarks, no floating digital overlays. A Kenyan woman agricultural engineer and a Kenyan male developer examining a small soil moisture sensor connected to a laptop on a bench inside a leafy greenhouse. Vegetable rows visible behind them, sunlight, practical agriculture technology experimentation. Both faces and sensor centered vertically, medium-wide view.

### hackathons/climate

- File: `public/marketing/hackathons/climate.webp`
- Export: 1600×900

Use case: photorealistic-natural. ONE category cover photograph for HackVillage hackathons. Landscape 16:9, requested 1600x900, also displayed center-cropped to 21:9. All people Black Kenyan adults. IMPORTANT medium-wide framing with plenty of background above heads: whole faces and key equipment inside central horizontal 60% height, camera far enough away for safe wide crop. Contemporary Kenya, realistic natural daylight and skin texture, documentary photography. Plain clothes, blank walls, no writing, no posters, no logos, watermark, or floating digital graphics. A Kenyan woman renewable-energy engineer and a Kenyan man software developer at a workbench examining a small solar panel wired to a sensor and laptop. Open bright maker workshop with green trees visible outside. Focused discussion about environmental monitoring, both faces at same height, solar panel visible mid-frame.

### hackathons/edtech

- File: `public/marketing/hackathons/edtech.webp`
- Export: 1600×900

Use case: photorealistic-natural. ONE category cover photograph for HackVillage hackathons. Landscape 16:9, requested 1600x900, also displayed center-cropped to 21:9. All people Black Kenyan adults. IMPORTANT medium-wide framing with plenty of background above heads: whole faces and key equipment inside central horizontal 60% height, camera far enough away for safe wide crop. Contemporary Kenya, realistic natural daylight and skin texture, documentary photography. Plain clothes, blank walls, no writing, no posters, no logos, watermark, or floating digital graphics. A Kenyan woman teacher and Kenyan man software developer seated together testing an interactive learning prototype on a tablet in a bright classroom with empty desks behind. Adults only, no children. Clear educational setting, laptop nearby, helpful engaged body language, tablet screen angled away.

### hackathons/civic

- File: `public/marketing/hackathons/civic.webp`
- Export: 1600×900

Use case: photorealistic-natural. ONE category cover photograph for HackVillage hackathons. Landscape 16:9, requested 1600x900, also displayed center-cropped to 21:9. All people Black Kenyan adults. IMPORTANT medium-wide framing with plenty of background above heads: whole faces and key equipment inside central horizontal 60% height, camera far enough away for safe wide crop. Contemporary Kenya, realistic natural daylight and skin texture, documentary photography. Plain clothes, blank walls, no writing, no posters, no logos, watermark, or floating digital graphics. Three Kenyan civic technology volunteers, two women and a man, gathered around a laptop and a simple paper city street map on a community workspace table. Discussing access to local public services and open data. Blank pinboard behind, open welcoming community room. Everyone seated, faces and map visible.

### hackathons/mobility

- File: `public/marketing/hackathons/mobility.webp`
- Export: 1600×900

Use case: photorealistic-natural. ONE category cover photograph for HackVillage hackathons. Landscape 16:9, requested 1600x900, also displayed center-cropped to 21:9. All people Black Kenyan adults. IMPORTANT medium-wide framing with plenty of background above heads: whole faces and key equipment inside central horizontal 60% height, camera far enough away for safe wide crop. Contemporary Kenya, realistic natural daylight and skin texture, documentary photography. Plain clothes, blank walls, no writing, no posters, no logos, watermark, or floating digital graphics. A Kenyan woman transport software developer showing a tablet route-planning prototype to a Kenyan male transit operator beside a parked Nairobi minibus. Both standing in open shade, medium-wide composition, neutral white and blue minibus softly blurred behind, no brand names or licence plate text visible. Practical urban mobility innovation.

### hackathons/security

- File: `public/marketing/hackathons/security.webp`
- Export: 1600×900

Use case: photorealistic-natural. ONE category cover photograph for HackVillage hackathons. Landscape 16:9, requested 1600x900, also displayed center-cropped to 21:9. All people Black Kenyan adults. IMPORTANT medium-wide framing with plenty of background above heads: whole faces and key equipment inside central horizontal 60% height, camera far enough away for safe wide crop. Contemporary Kenya, realistic natural daylight and skin texture, documentary photography. Plain clothes, blank walls, no writing, no posters, no logos, watermark, or floating digital graphics. A Kenyan woman cybersecurity engineer with short natural hair and a Kenyan male colleague reviewing network monitoring on a laptop in a calm bright modern office. A compact networking device and hardware security key on desk, a monitor with softly blurred abstract monitoring charts behind. No hoodies, masks, ominous lighting or hacker cliches.

## Validation

- TypeScript: `pnpm typecheck` passed.
- ESLint: all changed TypeScript/TSX files passed.
- Unit checks: 18 tests passed across `hackathon-covers.test.ts` and `blog.test.ts`; includes legacy seeded-cover migration and preservation of explicit uploaded covers.
- Chromium: 75 route/viewport combinations across desktop (1440), tablet (768), and mobile (390); all HTTP 200, no broken visible images. Covered all nine article pages, both blog indexes, three event listing phases, ten available public event detail pages, authentication pages, and static marketing pages.
- Visual review: desktop homepage, process cards, authentication, blog lists and article cover, event cards; mobile builder journey, escrow section, newsletter, and process cards; all ten 21:9 event category crops.
- Approved collage assets and `landing-hero.tsx`: byte-for-byte unchanged according to Git.
- All 34 final files present with expected export dimensions, totaling 3.96 MiB.
- Unrelated existing layout observation: the contribution guide has horizontal overflow at 390px; it contains no editorial images and was not modified.
