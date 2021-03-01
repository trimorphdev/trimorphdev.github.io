/**
 * Static site generator for Trimorph's Portfolio.
 * @author Zack Pace
 * @version 1.0.0
 */

/* Load libraries. */
const ejs = require('ejs');
const fs = require('fs');
const fsExtra = require('fs-extra');
const glob = require('glob');
const markdown = require('markdown-it')();

/* Delete the previous build. */
fs.rmdirSync('./docs', {
    recursive: true,
    force: true
});


/* Get the posts. */
const posts = [];

const files = glob.sync('posts/*.json');
files.forEach(file => {
    let content = JSON.parse(fs.readFileSync(file).toString());

    let postObject = {};

    postObject.title = content.title;
    postObject.body = markdown.render(fs.readFileSync(content.path).toString());
    postObject.links = content.links == undefined ? {} : content.links;
    
    posts.push(postObject);
});

/* Add static files to `docs` folder */
fs.mkdirSync('docs');

fsExtra.copy('static', 'docs');

/* Build website */
let contents = ejs.render(fs.readFileSync('views/main.ejs').toString(), {
    posts
});

fs.writeFileSync('docs/index.html', contents);