import ejs = require('ejs');
import glob = require('glob');
import fs = require('fs');
import fse = require('fs-extra');
import hljs from 'highlight.js';
// @ts-ignore
import metadataParser from 'markdown-yaml-metadata-parser';
import minify = require('html-minifier');
import path = require('path');
import showdown = require('showdown');

showdown.extension('highlight', function() {
    function htmlunencode(text: string) {
      return (
        text
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
        );
    }
    return [
        {
            type: 'output',
            filter: function (text, converter, options) {
                // use new shodown's regexp engine to conditionally parse codeblocks
                var left  = '<pre><code\\b[^>]*>',
                    right = '</code></pre>',
                    flags = 'g',
                    replacement = function (wholeMatch: string, match: string, left: string, right: string) {
                        // unescape match to prevent double escaping
                        match = htmlunencode(match);
                        const lang = (left.match(/class=\"([^ \"]+)/) || [])[1];
                        if (lang)
                            return left + hljs.highlight(match, {
                                language: lang
                            }).value + right;
                        
                        return wholeMatch;
                    };
                return showdown.helper.replaceRecursiveRegExp(text, replacement, left, right, flags);
            }
      }
    ];
});

// The path to the `public` directory
const out_path = path.join(__dirname, '../docs');
const public_path = path.join(__dirname, '../public');
const pages_path = path.join(public_path, 'pages');
const projects_path = path.join(public_path, 'projects');
const template_path = path.join(public_path, 'index.html');

// Markdown converter
const converter = new showdown.Converter({
    extensions: [
        'highlight'
    ],
    tables: true
});

// EJS Template
const template = ejs.compile(fs.readFileSync(template_path).toString());

/**
 * Renders markdown input to a file.
 * @param str the markdown input.
 * @param out filepath to output to.
 */
async function render(str: string, out: string) {
    let config = metadataParser(str);

    let html = template({
        title: config.metadata.title,
        body: converter.makeHtml(config.content)
    });

    let result = minify.minify(html, {
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        preserveLineBreaks: false,
        collapseWhitespace: true,
    });

    fs.writeFileSync(out, result);
}

function render_str(config: any, path: string): string {
    let buttons = [];

    let meta = config.metadata;

    if (meta.github)
        buttons.push(`
<a class="btn btn-primary" href="${meta.github}">
    Source
</a>`)

    if (config.content.trim().length > 0)
    buttons.push(`
    <a class="btn btn-primary" href="${path}">
    Read More
    </a>`)

    if (meta.view)
            buttons.push(`
    <a class="btn btn-primary" href="${meta.view}">
        View
    </a>`)

    return `
<h2>${meta.title}</h2>
<p>${meta.description}</p>
${buttons.join('&nbsp;')}`
}

if (!fs.existsSync(out_path))
    fs.mkdirSync(out_path);

glob('**/*.md', {
    cwd: pages_path,
}, (err, matches) => {
    if (err) throw err;

    for (let match of matches) {
        let filename = path.join(pages_path, match);
        
        let basename = path.basename(match).split('.')[0];
        let relative = path.relative(pages_path, filename);
        let final_name = path.join(out_path, path.dirname(relative), basename + '.html');
        
        console.log('[PAGE]   ', match);

        let dir = path.dirname(final_name);
        
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir);

        render(fs.readFileSync(path.join(pages_path, match)).toString(), final_name);
    }
});

glob('**/*.md', {
    cwd: projects_path,
}, (err, matches) => {
    if (err) throw err;

    let files: string[] = [];

    let path_out = path.join(out_path, 'projects');

    if (!fs.existsSync(path_out))
        fs.mkdirSync(path_out);

    for (let match of matches) {
        let filename = path.join(projects_path, match);
        
        let basename = path.basename(match).split('.')[0];
        let relative = path.relative(path.join(projects_path), filename);
        let final_name = path.join(path_out, path.dirname(relative), basename + '.html');

        console.log('[PROJECT]', match);

        let dir = path.dirname(final_name);
        
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir);
        
        let body = fs.readFileSync(path.join(projects_path, match)).toString();

        let config = metadataParser(body);
        files.push(render_str(config, path.join(path.dirname(relative), basename)));

        render(body, final_name)
    }

    let p = path.join(path_out, 'index.html');

    render(`---
title: Projects
---

${files.join('<hr>')}`, p);
});

fse.copySync(path.join(public_path, 'css'), path.join(out_path, 'css'));
fse.copySync(path.join(public_path, 'js'), path.join(out_path, 'js'));