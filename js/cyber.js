(function () {
    "use strict";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* mobile menu
     * ------------------------------------------------------ */
    const hdr = document.querySelector(".hdr");
    const toggle = document.querySelector(".hdr__toggle");

    if (hdr && toggle) {
        toggle.addEventListener("click", function () {
            const open = hdr.classList.toggle("is-open");
            toggle.setAttribute("aria-expanded", open);
            toggle.textContent = open ? "[ close ]" : "[ menu ]";
        });
        hdr.querySelectorAll(".nav a").forEach(function (link) {
            link.addEventListener("click", function () {
                hdr.classList.remove("is-open");
                toggle.setAttribute("aria-expanded", "false");
                toggle.textContent = "[ menu ]";
            });
        });
    }

    /* highlight the nav link of the section on screen (home page only)
     * ------------------------------------------------------ */
    const spySections = document.querySelectorAll("[data-spy]");

    if (spySections.length && "IntersectionObserver" in window) {
        const links = {};
        document.querySelectorAll(".nav a[href^='#']").forEach(function (a) {
            links[a.getAttribute("href").slice(1)] = a;
        });

        const spy = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                Object.values(links).forEach(function (a) { a.classList.remove("is-current"); });
                const link = links[entry.target.id];
                if (link) link.classList.add("is-current");
            });
        }, { rootMargin: "-45% 0px -50% 0px" });

        spySections.forEach(function (s) { spy.observe(s); });
    }

    /* fade sections in as they scroll into view
     * ------------------------------------------------------ */
    const reveals = document.querySelectorAll(".reveal");

    if (reduceMotion || !("IntersectionObserver" in window)) {
        reveals.forEach(function (el) { el.classList.add("is-visible"); });
    } else {
        const io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });
        reveals.forEach(function (el) { io.observe(el); });
    }

    /* typed prompt in the hero
     * ------------------------------------------------------ */
    const typed = document.querySelector("[data-type]");

    if (typed) {
        const text = typed.getAttribute("data-type");
        if (reduceMotion) {
            typed.textContent = text;
        } else {
            let i = 0;
            (function tick() {
                typed.textContent = text.slice(0, ++i);
                if (i < text.length) setTimeout(tick, 38);
            })();
        }
    }

    /* heading: decode "Welcome" in, then keep cycling through the languages
     * ------------------------------------------------------ */
    const decode = document.querySelector(".decode[data-words]");

    if (decode && !reduceMotion) {
        const words = decode.getAttribute("data-words").split("|");
        const glyphs = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@$/<>*+=";
        const hold = 3200;          // ms each word stays readable
        const duration = 900;       // ms of scrambling per change

        const randomGlyph = function () {
            return glyphs.charAt(Math.floor(Math.random() * glyphs.length));
        };

        // scramble from whatever is shown into `target`, letters locking in left to right
        const decodeTo = function (target, done) {
            const length = Math.max(target.length, decode.textContent.length);
            const lockAt = [];
            for (let i = 0; i < length; i++) {
                lockAt.push(duration * (0.25 + 0.75 * i / length) + Math.random() * 120);
            }
            const start = performance.now();

            (function tick(now) {
                const t = now - start;
                decode.textContent = "";
                let finished = true;

                for (let i = 0; i < length; i++) {
                    const ch = target.charAt(i);
                    if (t >= lockAt[i]) {
                        decode.appendChild(document.createTextNode(ch));
                    } else {
                        finished = false;
                        if (ch === " ") {
                            decode.appendChild(document.createTextNode(" "));
                        } else {
                            const g = document.createElement("span");
                            g.className = "decode__glyph";
                            g.textContent = randomGlyph();
                            decode.appendChild(g);
                        }
                    }
                }

                if (finished) {
                    decode.textContent = target;
                    if (done) done();
                } else {
                    setTimeout(function () { requestAnimationFrame(tick); }, 45);
                }
            })(start);
        };

        let index = 0;

        const next = function () {
            decodeTo(words[index], function () {
                index = (index + 1) % words.length;
                setTimeout(next, hold);
            });
        };

        decode.textContent = " ";   // keep the line's height until the first decode
        setTimeout(next, 300);
    }

    /* keyword cloud: words laid out in an ellipse, each one an INSPIRE search
     * ------------------------------------------------------ */
    const cloud = document.querySelector(".cloud[data-inspire]");

    if (cloud) {
        const list = cloud.querySelector("ul");
        const author = cloud.getAttribute("data-inspire");
        const REF_WIDTH = 940;      // width of the image the data-s sizes were read from
        const MIN_FONT = 8.5;       // smaller words are left out (mostly on phones)

        // small stable hash, so colours and positions are the same on every visit
        const hash = function (str) {
            let h = 2166136261;
            for (let i = 0; i < str.length; i++) {
                h ^= str.charCodeAt(i);
                h = Math.imul(h, 16777619);
            }
            return h >>> 0;
        };

        const items = Array.prototype.map.call(list.children, function (li) {
            const term = li.textContent.trim();
            const a = document.createElement("a");
            a.href = "https://inspirehep.net/literature?q=" +
                encodeURIComponent("authors.recid:" + author + ' and "' + term + '"');
            a.target = "_blank";
            a.rel = "noopener";
            a.title = "Search my papers for “" + term + "” on INSPIRE";
            a.textContent = term;
            li.textContent = "";
            li.appendChild(a);
            li.classList.add("c" + (hash(term) % 5));
            return { li: li, size: parseFloat(li.getAttribute("data-s")) || 12, seed: hash(term) };
        }).sort(function (x, y) { return y.size - x.size; });

        const overlaps = function (a, b) {
            return a.l < b.l + b.w && b.l < a.l + a.w && a.t < b.t + b.h && b.t < a.t + a.h;
        };

        let laidWidth = 0;

        const layout = function () {
            const W = list.clientWidth;
            if (!W || W === laidWidth) return;
            laidWidth = W;

            const H = Math.round(W * (W < 640 ? 1.05 : 0.58));
            const scale = Math.min(1.15, Math.max(0.5, W / REF_WIDTH));
            const cx = W / 2, cy = H / 2;
            const stretch = W / H;          // spiral follows the ellipse's shape
            const placed = [];

            cloud.classList.add("is-laid");
            list.style.height = H + "px";

            items.forEach(function (it) {
                const font = it.size * scale;
                it.li.classList.remove("is-dropped");
                if (font < MIN_FONT) { it.li.classList.add("is-dropped"); return; }

                it.li.style.fontSize = font.toFixed(1) + "px";
                const gap = Math.max(2, font * 0.08);
                const w = it.li.offsetWidth + gap;
                const h = it.li.offsetHeight + gap;
                const turn = (it.seed % 628) / 100;
                let last = null;
                let spot = null;

                // walk outwards along a spiral until the word fits
                for (let theta = 0, r = 0; r < H * 0.6; theta += Math.min(0.45, 3 / Math.max(r, 1))) {
                    r = 1.1 * theta;
                    const box = {
                        l: cx + r * stretch * Math.cos(theta + turn) - w / 2,
                        t: cy + r * Math.sin(theta + turn) - h / 2,
                        w: w, h: h
                    };
                    if (box.l < 0 || box.t < 0 || box.l + w > W || box.t + h > H) continue;

                    // keep every corner inside the ellipse (with a little slack)
                    const dx = Math.max(Math.abs(box.l - cx), Math.abs(box.l + w - cx)) / cx;
                    const dy = Math.max(Math.abs(box.t - cy), Math.abs(box.t + h - cy)) / cy;
                    if (dx * dx + dy * dy > 1.12) continue;

                    if (last && overlaps(box, last)) continue;
                    last = null;
                    for (let i = 0; i < placed.length; i++) {
                        if (overlaps(box, placed[i])) { last = placed[i]; break; }
                    }
                    if (!last) { spot = box; break; }
                }

                if (!spot) { it.li.classList.add("is-dropped"); return; }
                placed.push(spot);
                it.li.style.transform = "translate(" + (spot.l + gap / 2).toFixed(1) + "px," +
                    (spot.t + gap / 2).toFixed(1) + "px)";
            });
        };

        const show = function () {
            if (reduceMotion) { cloud.classList.add("is-shown"); return; }
            items.forEach(function (it, rank) { it.li.style.transitionDelay = (rank * 6) + "ms"; });
            if (!("IntersectionObserver" in window)) { cloud.classList.add("is-shown"); return; }
            const io = new IntersectionObserver(function (entries) {
                if (!entries[0].isIntersecting) return;
                cloud.classList.add("is-shown");
                io.disconnect();
                // hover fades should be instant after the entrance
                setTimeout(function () {
                    items.forEach(function (it) { it.li.style.transitionDelay = ""; });
                }, items.length * 6 + 600);
            }, { threshold: 0.2 });
            io.observe(cloud);
        };

        const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        fontsReady.then(function () {
            layout();
            show();
        });

        let resizeTimer;
        window.addEventListener("resize", function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(layout, 150);
        });
    }

    /* latest papers, pulled live from INSPIRE
     * ------------------------------------------------------ */
    const feed = document.querySelector(".feed");
    const status = document.querySelector(".terminal__status");

    if (feed) {
        const url = "https://inspirehep.net/api/literature?sort=mostrecent&size=10" +
            "&q=authors.recid:1718064" +
            "&fields=titles,authors.full_name,author_count,collaborations,arxiv_eprints,preprint_date,document_type,control_number";

        // "Alestas, George" -> "G. Alestas"
        const shortName = function (fullName) {
            const parts = fullName.split(",");
            if (parts.length < 2) return fullName;
            const initials = parts[1].trim().split(/[\s-]+/).map(function (n) { return n.charAt(0) + "."; }).join(" ");
            return initials + " " + parts[0].trim();
        };

        // titles can contain MathML; keep only the text (LaTeX is left for MathJax)
        const plainText = function (html) {
            return new DOMParser().parseFromString(html, "text/html").body.textContent;
        };

        fetch(url)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                const papers = data.hits.hits
                    .map(function (h) { return h.metadata; })
                    .filter(function (m) { return m.document_type.indexOf("article") !== -1; })
                    .slice(0, 5);

                papers.forEach(function (m) {
                    const li = document.createElement("li");
                    const date = document.createElement("span");
                    const body = document.createElement("div");
                    const title = document.createElement("a");
                    const authors = document.createElement("span");

                    date.className = "feed__date";
                    date.textContent = m.preprint_date ? "[" + m.preprint_date.slice(0, 7) + "]" : "";

                    title.className = "feed__title";
                    title.textContent = plainText(m.titles[0].title);
                    title.href = m.arxiv_eprints
                        ? "https://arxiv.org/abs/" + m.arxiv_eprints[0].value
                        : "https://inspirehep.net/literature/" + m.control_number;

                    authors.className = "feed__authors";
                    if (m.collaborations && m.author_count > 10) {
                        authors.textContent = m.collaborations[0].value + " Collaboration";
                    } else {
                        m.authors.forEach(function (a, i) {
                            if (i > 0) authors.appendChild(document.createTextNode(", "));
                            const name = shortName(a.full_name);
                            if (a.full_name.indexOf("Alestas") === 0) {
                                const strong = document.createElement("strong");
                                strong.textContent = name;
                                authors.appendChild(strong);
                            } else {
                                authors.appendChild(document.createTextNode(name));
                            }
                        });
                    }

                    body.appendChild(title);
                    body.appendChild(authors);
                    li.appendChild(date);
                    li.appendChild(body);
                    feed.appendChild(li);
                });

                if (status) status.textContent = papers.length + " records received";
                if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([feed]);
            })
            .catch(function () {
                if (status) status.innerHTML = 'connection lost &mdash; see the <a href="https://inspirehep.net/authors/1718064">full list on INSPIRE</a>';
            });
    }
})();
