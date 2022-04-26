import * as playground from '../../wasm/playground.js';
import * as cons from '../console.js';
import * as sidebar from '../sidebar.js';

export async function inic() {
    let win = document.querySelector("#import_project.win:not(.i)"),
        button_open = document.querySelector('#container .header .import');
    if (!win || !button_open) { return; }

    let hide = () => win.removeClass('open').addClass('hide'),
        open = () => {
            win.removeClass('hide success error')
                .addClass('open')
                .querySelectorAll('.progress, .message')
                .forEach(el => el.addClass('hide'));
            win.querySelector(".upload").removeClass("hide");
        };

    win.addClass('i')
        .querySelectorAll(".bg,.close")
        .forEach(el => el.addEventListener('click', hide));
    button_open.addEventListener('click', (e) => {
        e.stopPropagation();
        open();
    });
    window.addEventListener('keyup', e => {
        if (e.key === "Escape" || e.keyCode === 27) {
            hide();
        }
    });
    window.addEventListener('keydown', e => {
        if (e.ctrlKey && e.code === "KeyO") {
            e.preventDefault();
            open();
        }
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        win.addEventListener(eventName, preventDefaults, false)
    })
    function preventDefaults(e) {
        e.preventDefault()
        e.stopPropagation()
    }

    win.querySelector('input[type=file]')
        .addEventListener('change', function (e) {
            e.stopPropagation();
            upload_file(this);
        });
    win.addEventListener('drop', function (e) {
        e.stopPropagation();
        upload_file(e.dataTransfer);
    });
}

function upload_file(fileInput) {
    if (fileInput.files.length == 0) { return; }
    let fr = new FileReader(),
        project_name;

    fr.onload = function () {
        let array = Array.from(new Uint8Array(fr.result));
        playground.ActionOnProject.import(array)
            .then(name => {
                project_name = name
                return sidebar.project_load()
            })
            .then(_ => {
                message("success", "Project was successfully imported");
                // Close the message
                setTimeout(() =>
                    document.querySelector("#import_project.win")
                        .removeClass("open")
                        .addClass("hide"),
                    3000
                );
                // Open a new project
                document.querySelector('#projects .project[data-name="' + project_name + '"] button.title').click();
                cons.status("Done");
            })
            .catch(error => {
                console.error(error);
                cons.status("Error");
                message("error", error);
            });

        fileInput.value = '';
    };
    fr.readAsArrayBuffer(fileInput.files[0]);
}

function message(type, text) {
    let win = document.querySelector("#import_project.win")
        .removeClass("success error")
        .addClass(type);
    win.querySelectorAll('.progress, .upload').forEach(el => el.addClass('hide'));
    win.querySelector('.message')
        .removeClass('hide')
        .querySelector(".text").innerHTML = text;
}
