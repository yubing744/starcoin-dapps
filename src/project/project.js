import * as editor from './editor.js';
import * as cons from './console.js';
import * as download from './sidebar/download.js';
import * as playground from '../wasm/playground.js';

/// Create a project object. 
/// It stores information about the project, id, open files
export async function create(id) {
    if (!id) {
        id = null;
    }
    return {
        id: null,
        files: {},
        /// Set project id. All open tabs will be closed
        set_project_id: function (id) {
            this.destroy().id = id;
            return this;
        },
        /// open file in tab
        open_file: function (file_id, file_name, line, char) {
            if (this.files[file_id]) {
                if (this.files[file_id].set_active) {
                    this.files[file_id]
                        .set_active()
                        .set_position(line, char);
                }
            } else {
                this.files[file_id] = {};
                editor
                    .open_file(this.id, file_id, file_name, line, char)
                    .then(tab => this.files[file_id] = tab);
            }

            return this;
        },
        /// closing a file and a tab
        close_file: function (file_id) {
            if (this.files[file_id] && this.files[file_id].destroy) {
                this.files[file_id].destroy();
            }
            delete this.files[file_id];

            let last = this.get_last();
            if (last && last.set_active) {
                last.set_active();
            }

            return this;
        },
        get_last: function () {
            return Object.values(this.files).at(-1);
        },
        get_active_tabs: function () {
            return Object
                .values(this.files)
                .filter(file => file.active);
        },
        /// destroy an open project
        destroy: function () {
            /// closing tabs
            for (let index in this.files) {
                if (this.files[index].destroy) {
                    this.files[index].destroy();
                }
            }
            this.files = {};
            this.id = null;
            return this;
        },
        /// building a project
        build: async function () {
            if (!this.id) {
                cons.status("Warning: Select a project..");
                return this;
            }

            cons.status("Building a project..");
            let start = Date.now();
            playground.ActionOnProject.build(window.open_project.id)
                .then(_ => {
                    cons.output("The project was successfully built: " +
                        ((Date.now() - start) / 1000) + "s");
                    cons.status("Done");
                })
                .catch(error => {
                    console.error(error);
                    cons.status("Error")
                    cons.output(error);

                });

            return this;
        },
        /// cleaning up the project
        /* clean: function () {
            console.log("@todo project clean");
            return this;
        }, */
        /// testing the project
        test: function () {
            console.log("@todo project test");
            return this;
        },
        /// Checking the project
        check: function () {
            console.log("@todo project check");
            return this;
        },
        /// Checking the project
        run_script: function (command) {
            cons.status("Running the script..");
            playground.ActionOnProject.run(this.id, command)
                .then(response => {
                    console.log(response);
                    cons.status("Done")
                    cons.output(response);
                })
                .catch(err => {
                    console.warn(err);
                    cons.status("Error when running the script");
                    cons.output(err);
                });
            return this;
        },
        /// Checking the project
        transaction: function (command) {
            cons.status("Сreating a transaction..");

            let win = download
                .create({
                    head: "Creating a transaction",
                    download_message: "Click on the button to download the transaction",
                    timer_step: 20,
                    file_name: "transaction.mvt"
                })
                .show()
                .progress_bar_with_timer();

            playground.ActionOnProject.tx(this.id, command)
                .then(data => {
                    win.download(data);
                    cons.status("Done")
                })
                .catch(err => {
                    console.warn(err);
                    cons.status("Error when creating the transaction");
                    win.error(err);
                });
            return this;
        },
        export: function () {
            let name = document.querySelector('#projects .project[data-id="' + this.id + '"] button').innerHTML;
            let win = download
                .create({
                    head: "Export a project",
                    download_message: 'Download the project "' + this.id + '" in a zip archive',
                    timer_step: 20,
                    file_name: name + ".zip"
                })
                .show()
                .progress_bar_with_timer();

            playground.ActionOnProject
                .export(this.id)
                .then((data) => {
                    win.download(data);
                    cons.status("Done")
                })
                .catch(error => {
                    console.warn(ererrorr);
                    cons.status("Error when creating a zip archive");
                    win.error(error);
                });

            return this;
        }
    };
}