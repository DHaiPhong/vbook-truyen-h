// Chạy thử một script của extension trên máy tính, giả lập runtime vBook
// (fetch đồng bộ qua curl, Response, load, hằng số config từ plugin.json).
// Dùng khi không kết nối được server debug trên điện thoại.
//
//   node tools/test.js <script.js> [tham số...] [--full] [--config KEY=giá-trị]
//   node tools/test.js detail.js "https://truyen-h.com/story?id=..."
//   node tools/test.js check_login.js --config "COOKIE=a=b; c=d"
//
// Chuỗi dài hơn 300 ký tự chỉ in độ dài, trừ khi có --full.

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");
const UA = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36";

function makeResponse(url, status, body, headers) {
    return {
        status: status,
        ok: status >= 200 && status < 300,
        url: url,
        headers: headers,
        header: function (key) { return headers[String(key).toLowerCase()] || ""; },
        text: function () { return body; },
        json: function () { return JSON.parse(body); },
        html: function () { throw new Error("html() chưa được giả lập trong tools/test.js"); }
    };
}

function fetchSync(url, options) {
    options = options || {};
    if (options.queries) {
        const qs = Object.keys(options.queries).map(function (k) {
            return encodeURIComponent(k) + "=" + encodeURIComponent(options.queries[k]);
        }).join("&");
        url += (url.indexOf("?") === -1 ? "?" : "&") + qs;
    }
    const args = ["-sS", "-L", "-A", UA, "-D", "-", "--max-time", String((options.timeout || 120000) / 1000)];
    const headers = options.headers || {};
    Object.keys(headers).forEach(function (k) { args.push("-H", k + ": " + headers[k]); });
    if (options.method && options.method !== "GET") args.push("-X", options.method);
    if (options.body && options.method && options.method !== "GET") args.push("--data-raw", String(options.body));
    args.push(url);

    let raw;
    try {
        raw = execFileSync("curl", args, { maxBuffer: 64 * 1024 * 1024 }).toString("utf8");
    } catch (e) {
        return makeResponse("", 504, "", {});
    }
    // -D - in header của mọi lần redirect; lấy khối header cuối cùng.
    let status = 0;
    let respHeaders = {};
    let rest = raw;
    while (/^HTTP\//.test(rest)) {
        const end = rest.indexOf("\r\n\r\n");
        const block = rest.substring(0, end);
        rest = rest.substring(end + 4);
        const lines = block.split("\r\n");
        status = parseInt(lines[0].split(" ")[1]);
        respHeaders = {};
        lines.slice(1).forEach(function (l) {
            const i = l.indexOf(":");
            if (i > 0) respHeaders[l.substring(0, i).trim().toLowerCase()] = l.substring(i + 1).trim();
        });
    }
    console.log("[fetch] " + status + " " + url);
    return makeResponse(url, status, rest, respHeaders);
}

function shorten(value, full) {
    if (full) return value;
    if (typeof value === "string") return value.length > 300 ? "<chuỗi " + value.length + " ký tự>" : value;
    if (Array.isArray(value)) return value.map(function (v) { return shorten(v, full); });
    if (value && typeof value === "object") {
        const out = {};
        Object.keys(value).forEach(function (k) { out[k] = shorten(value[k], full); });
        return out;
    }
    return value;
}

// Runtime vBook là Rhino, không hỗ trợ cú pháp ES6+ dưới đây.
function checkSyntax() {
    const rules = [
        [/=>/, "arrow function"], [/`/, "template literal"], [/\?\./, "optional chaining"],
        [/\?\?/, "nullish coalescing"], [/\basync\b|\bawait\b/, "async/await"], [/\.\.\.\w/, "spread"],
        [/\.flat(Map)?\(/, "flat/flatMap"], [/\(\?<[=!]/, "lookbehind"], [/\(\?<\w+>/, "named group"]
    ];
    let ok = true;
    fs.readdirSync(SRC).filter(function (f) { return f.endsWith(".js"); }).forEach(function (f) {
        fs.readFileSync(path.join(SRC, f), "utf8").split("\n").forEach(function (line, i) {
            rules.forEach(function (r) {
                if (r[0].test(line)) {
                    ok = false;
                    console.log("[rhino] " + f + ":" + (i + 1) + " dùng " + r[1]);
                }
            });
        });
    });
    return ok;
}

function main() {
    const argv = process.argv.slice(2);
    const full = argv.indexOf("--full") !== -1;
    const overrides = {};
    const args = [];
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === "--full") continue;
        if (argv[i] === "--config") {
            const kv = argv[++i] || "";
            const eq = kv.indexOf("=");
            overrides[kv.substring(0, eq)] = kv.substring(eq + 1);
            continue;
        }
        args.push(argv[i]);
    }
    const script = args.shift();
    if (!script) {
        console.log("Cách dùng: node tools/test.js <script.js> [tham số...] [--full]");
        process.exit(2);
    }
    checkSyntax();

    const plugin = JSON.parse(fs.readFileSync(path.join(ROOT, "plugin.json"), "utf8"));
    const logs = [];
    const ctx = vm.createContext({
        fetch: fetchSync,
        console: { log: function () { logs.push([].slice.call(arguments).join(" ")); } },
        Log: { log: function (m) { logs.push(String(m)); } },
        Response: {
            success: function (data, data2) { return JSON.stringify({ code: 0, data: data, data2: data2 }); },
            error: function (msg) { return JSON.stringify({ code: 1, data: msg }); }
        },
        load: function (name) {
            vm.runInContext(fs.readFileSync(path.join(SRC, name), "utf8"), ctx, { filename: name });
        }
    });

    // vBook chèn mỗi khoá config thành một hằng chuỗi trước khi chạy script.
    const config = plugin.config || {};
    const inject = Object.keys(config).filter(function (k) {
        return !(config[k] && config[k].mode === "database");
    }).map(function (k) {
        let v = config[k] && typeof config[k] === "object" ? config[k].default : config[k];
        if (k in overrides) v = overrides[k];
        return "const " + k + " = " + JSON.stringify(String(v)) + ";";
    }).join("\n");
    vm.runInContext(inject, ctx, { filename: "config-inject" });
    vm.runInContext(fs.readFileSync(path.join(SRC, script), "utf8"), ctx, { filename: script });

    console.log("[input] " + script + " " + JSON.stringify(args));
    const result = ctx.execute.apply(null, args);
    logs.forEach(function (l) { console.log("[log] " + l); });
    const parsed = JSON.parse(result);
    console.log(JSON.stringify(shorten(parsed, full), null, 2));
    process.exit(parsed.code === 0 ? 0 : 1);
}

main();
