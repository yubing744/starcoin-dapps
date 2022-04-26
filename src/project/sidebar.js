import './lib.js';
import * as playground from '../wasm/playground.js';
import * as project from './project.js';
import * as cons from './console.js';
import * as forms from './forms.js'
import * as address_map from './sidebar/address_map.js'
import * as dependencies from './sidebar/dependencies.js'
import * as explorer from './sidebar/explorer.js'
import * as export_project from './sidebar/export_project.js'
import * as import_project from './sidebar/import_project.js'
import * as tx_run from './sidebar/tx_and_run.js'
import * as wasm_event from './events.js';

const TEMPLATE_PROJECT_ELEMENT = `
    <div class="project noselect" data-id="{{id}}" >
        <button type="button" class="project-title title">{{name}}</button>
        <button type="button" class="project-rename" title="Rename a project"><svg ><use xlink:href="#icon-rename"></use></svg></button>
        <button type="button" class="project-remove" title="Delete a project">-</button>
    </div>
    `;

/// initializing the sidebar
export async function init(isReinitting = false) {
    // ID of the Open project
    window.open_project = await project.create();
    address_map.win_inic();
    dependencies.win_inic();
    await project_load();
    
    if (isReinitting) return;

    import_project.inic();
    export_project.inic();
    cons.inic_panel();
    inic_header_buttons();
    wasm_event.inic();

    
    // open projects list
    on_click_icon_panel(document.querySelectorAll("#navigation .ico-panel li button")[0]);

    // Button: Add a project
    document
        .querySelector("#projects-container .head .add_project:not(.i)")
        .addClass("i")
        .addEventListener("click", on_add_project);

    tx_run.inic_run();
    tx_run.inic_tx();

    // displaying hints
    window.addEventListener("keydown", function (e) {
        if (e.key === "Control") {
            document
                .querySelectorAll("#navigation .ico-panel li button .keyhelp, #container .header button .keyhelp")
                .forEach(el => el.addClass("show"));
        }
    });
    window.addEventListener("keyup", function (e) {
        if (e.key === "Control") {
            document
                .querySelectorAll("#navigation .ico-panel li button .keyhelp, #container .header button .keyhelp")
                .forEach(el => el.removeClass("show"));
        }
    });

    document
        .querySelectorAll("#navigation .ico-panel li button:not(.i)")
        .forEach(button => {
            button
                .addClass('i')
                .addEventListener('click', function (e) {
                    e.stopPropagation();
                    on_click_icon_panel(this);
                    return false;
                });
        });

    document
        .addEventListener("keydown", function (e) {
            if (e.ctrlKey && (
                e.key === "1"
                || e.key === "2"
                || e.key === "3"
                || e.key === "4"
                || e.key === "5"
                || e.key === "6")
            ) {
                e.preventDefault();
                let button = document.querySelectorAll("#navigation .ico-panel li button")[e.key - 1];
                if (button.hasClass("hide")) { return; }
                on_click_icon_panel(button);
                return false;
            }
        });
    
    const version = await playground.version()
    console.info(`WASM Version: ${version}`);
}

function on_click_icon_panel(click_button) {
    let chield = document
        .getElementById(click_button.attr("child-panel"));
    if (click_button.hasClass("open")) {
        click_button.removeClass("open");
        if (chield) {
            chield
                .removeClass("open")
                .addClass('hide');
        }
        return;
    }

    click_button
        .parentElement
        .parentElement
        .querySelectorAll('button.open')
        .forEach(el => el.removeClass("open"));
    click_button.addClass("open").removeClass("hide");

    document
        .querySelectorAll("#navigation .list-panel .container:not(.hide)")
        .forEach(el => el.removeClass("open").addClass("hide"));

    if (!chield) { return; }
    chield
        .removeClass("hide")
        .addClass("open");

    let command_input = chield.querySelector('input.command');
    if (command_input) {
        command_input.focus();
    }
}

// ===============================================================
//  Projects
// ===============================================================
/// Display the found projects on the computer in the sidebar
export async function project_load() {
    cons.status("Loading projects...");

    let projects_element = document.querySelector("#projects .cont");
    if (projects_element === undefined) {
        return;
    }
    projects_element.innerHTML = "";

    let list;
    try { list = playground.ListProjects.get(); }
    catch (e) {
        playground.ListProjects.set([]);
        console.error(e);
        cons.status("Error when getting the list of projects");
        cons.output(e)
        return;
    }

    if (!list) {
        cons.status("Done");
        return;
    }

    Object.keys(list)
        .forEach(id => {
            let name = list[id];
            let item = TEMPLATE_PROJECT_ELEMENT
                .replaceAll("{{id}}", id)
                .replaceAll("{{name}}", name);
            projects_element.insertAdjacentHTML('beforeend', item);
        });

    // open a project
    projects_element
        .querySelectorAll(".project:not(.i)")
        .forEach(project =>
            project
                .addClass('i')
                .addEventListener('click', on_click_project)
        );

    // delete a project
    projects_element
        .querySelectorAll(".project .project-remove:not(.i)")
        .forEach(project =>
            project
                .addClass('i')
                .addEventListener('click', on_click_project_remove)
        );

    // rename a project
    projects_element
        .querySelectorAll(".project .project-rename:not(.i)")
        .forEach(project =>
            project
                .addClass('i')
                .addEventListener('click', on_click_project_rename)
        );
    cons.status("Done");

}

/// Click on the project name in the sidebar
function on_click_project(e) {
    e.stopPropagation();
    let id = this.attr('data-id');
    if (!id) {
        throw "Project id not specified";
    }

    if (window.open_project.destroy) {
        window.open_project.destroy();
    }
    window.open_project.set_project_id(id);

    let buttons = document.querySelectorAll("#navigation .ico-panel li button");
    // 1 - explorer
    // 2 - addresses
    // 3 - dependencies
    // 4 - run script
    // 5 - tx
    [1, 2, 3, 4, 5].forEach(index => buttons[index].removeClass("hide"));

    explorer
        .load()
        .then(_ => {
            // open explorer panel
            if (!document.querySelector("#explorer-container").hasClass("open")) {
                on_click_icon_panel(document.querySelectorAll("#navigation .ico-panel li button")[1]);
            }
            cons.status("Done")
        }, error => {
            cons.status("Error: Failed to get information")
            console.warn(error);
        });

    tx_run.run_command_show_history();
    tx_run.tx_command_show_history();
    dependencies.loaddata();
    address_map.loaddata();
    dependencies.loaddata();
}

function on_click_project_rename(e) {
    e.stopPropagation();
    let parent = this.parentNode;
    forms
        .name_can_empty(
            parent,
            parent.querySelector("button.title").innerHTML
        )
        .then(new_name => playground.ListProjects.rename(parent.attr("data-id"), new_name))
        .then(project_load)
        .then(_ => cons.status("Done"))
        .catch(error => {
            cons.status("Error");
            cons.output(error);
            console.error(error);
        });

    return false;
}

function on_click_project_remove(e) {
    e.stopPropagation();
    if(!window.confirm('Are you sure you want to delete this project?')) return;

    let id = this.parentNode.attr("data-id");
    try {
        cons.status("The project is being deleted", 5000);
        if (window.open_project.id === id) {
            window.open_project.destroy();
        }
        playground.ListProjects.remove(id)
            .then(project_load);

        let buttons = document.querySelectorAll("#navigation .ico-panel li button");
        // 1 - explorer
        // 2 - addresses
        // 3 - dependencies
        // 4 - run script
        // 5 - tx
        [1, 2, 3, 4, 5].forEach(index => buttons[index].addClass("hide"));
    } catch (error) {
        cons.status("Error");
        console.warn(error);
    }
}

// Event: Creating a project
function on_add_project(e) {
    e.stopPropagation();
    let main_block = this.parentByClass("head");

    cons.status("Please enter the project name");
    forms
        .name(main_block, "")
        .then(project_name => {
            playground.ListProjects.add(project_name);
            project_load();
            cons.status("Creating project");
        })
        .catch(error => {
            cons.status("Error");
            cons.output(error);
            console.error(error);
        });

    return false;
}

// ===============================================================
//  header buttons
// ===============================================================
function inic_header_buttons() {
    document
        .querySelector("#container .header button.build")
        .addEventListener("click", function (e) {
            e.stopPropagation();
            if (window.open_project.build) {
                window.open_project.build();
            }
        });
    window.addEventListener("keydown", function (e) {
        if (e.ctrlKey && e.code === "F6") {
            e.preventDefault();
            document
                .querySelector("#container .header button.build")
                .click()
                .focus();
            return false;
        }
    });

    document
        .querySelector("#container .header button.check")
        .addEventListener("click", function (e) {
            e.stopPropagation();
            if (window.open_project.check) {
                window.open_project.check();
            }
        });
    window.addEventListener("keydown", function (e) {
        if (e.ctrlKey && e.code === "F7") {
            e.preventDefault();
            document
                .querySelector("#container .header button.check")
                .click()
                .focus();
            return false;
        }
    });

    document
        .querySelector("#container .header button.test")
        .addEventListener("click", function (e) {
            e.preventDefault();
            if (window.open_project.test) {
                window.open_project.test();
            }
        });
    window.addEventListener("keydown", function (e) {
        if (e.ctrlKey && e.code === "F8") {
            e.preventDefault();
            document
                .querySelector("#container .header button.test")
                .click()
                .focus();
            return false;
        }
    });

    /* document
        .querySelector("#container .header button.clean")
        .addEventListener("click", function (e) {
            e.preventDefault();
            if (window.open_project.clean) {
                window.open_project.clean();
            }
        });
    window.addEventListener("keydown", function (e) {
        if (e.ctrlKey && e.code === "F9") {
            e.preventDefault();
            document
                .querySelector("#container .header button.clean")
                .click()
                .focus();
            return false;
        }
    }); */
}