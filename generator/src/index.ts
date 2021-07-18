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
                        return left + hljs.highlight(match, {
                            language: lang
                        }).value + right;
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
const template_path = path.join(public_path, 'index.html');

// Markdown converter
const converter = new showdown.Converter({
    extensions: [
        'highlight'
    ]
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
        console.log(match, relative, final_name);
        //fs.mkdirSync(path.dirname(final_name));

        let dir = path.dirname(final_name);
        
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir);

        render(fs.readFileSync(path.join(pages_path, match)).toString(), final_name);
    }
});

fse.copySync(path.join(public_path, 'css'), path.join(out_path, 'css'));
fse.copySync(path.join(public_path, 'js'), path.join(out_path, 'js'));