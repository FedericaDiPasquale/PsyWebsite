---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["chi-sono/index.html","trattamenti/index.html","prenota/index.html","contatti/index.html"]
---

# Surface brief: sito "app shell" (home, chi-sono, trattamenti, prenota, contatti)

Mode: Persuade. Visitor: adult in Ragusa (often on a phone) going through a hard period; action: book the free first consultation via Calendly, or write/call. Proof on hand: real portrait, real studio photo, real credentials (Albo 10319-A, TFP, EMDR, Mindfulness), practical facts. No testimonials exist. Constraints: copy preserved (redistributed across pages and sub-tabs, no new claims), SEO first (one real URL per page with full HTML, unique title/description/H1, JSON-LD), Calendly + Formspree + cookie consent working, old #anchors redirect to the new pages.

User decisions (2026-10-13): no page scrolling on mobile or desktop; fixed top and bottom; choosing a page from the menu swaps only the content in between; long content split into sub-tabs inside the page; on mobile the fixed bottom is the menu bar. No photo in the opening; editorial look with fewer boxes, same palette and type.

## Direction contract

THESIS: The category standard played straight as a calm "app shell": a fixed frame (header and footer) that never moves, and one screen of content at a time that changes when a button is pressed, so an anxious visitor never has to scroll or hunt. Refuses the long scroll, the card-on-tint template, the portrait-as-hero and every section in a box.

OWN-WORLD: Cool off-white ground, deep petrol ink and fills, apricot reserved only for the free first consultation, mist-aqua as the one quiet tint. Poppins Light (300) self-hosted for headings, as on the previous site the user likes, with regular body text; moderate display sizes scaled to viewport height; minimal copy with no repeated calls to action, hairline dividers instead of containers. Pill buttons and pill sub-tab chips; 28px radius only on photos, the map and the Calendly frame. Phosphor icons only in the mobile menu, contact channels and link arrows.

STORY: Home says what she is and where, offers the free first consultation and one button to book; Chi sono (Profilo, Esperienza, Approccio, Formazione, Certificazioni) builds trust; Trattamenti (three services) explains; Prenota (calendar plus one line of practical facts and Bonus) books; Contatti (Recapiti, Mappa, Messaggio) writes or finds the studio.

FIRST VIEWPORT (home): The whole site is the first viewport. Fixed header with name left and pill buttons right (desktop) or name only (mobile). Centre: display H1 "Psicologa e Psicoterapeuta / a Ragusa", name and role line, apricot offer, petrol "Prenota un appuntamento" button plus a quiet "Chi sono" link, and a hairline row of four facts at the bottom of the content area. Fixed footer: on desktop a slim hairline bar with legal line (copyright, P.IVA, Albo) and quick contacts; on mobile the five-button menu bar.

FORM: Category canon (standing preference chosen by the user), restructured as a fixed-frame, button-navigated site with real URLs and in-place content swaps; seed key 664ab2ee. Signature interaction: pressing a menu button or a sub-tab swaps only the content area with a short cross-fade and rise (View Transitions where supported), the frame stays perfectly still; reduced motion swaps instantly.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
