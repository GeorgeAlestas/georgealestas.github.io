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
