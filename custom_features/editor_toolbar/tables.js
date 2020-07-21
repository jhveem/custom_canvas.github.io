(async function () {
  tableOptions = [
    'btech-tabs-table',
    'btech-dropdown-table'
  ];
  //escape if not on the editor page
  if (!TOOLBAR.checkEditorPage()) return;
  async function addClassToTable(className) {
    //get the currently selected node
    let node = tinyMCE.activeEditor.selection.getNode();
    //get the parent
    let parent = tinyMCE.activeEditor.dom.getParent(node, "table");
    if (parent !== null) {
      //see if it's already got the class in question, if so remove it, otherwise remove all other classes and add that one
      if ($(parent).hasClass(className)) {
        tinyMCE.activeEditor.dom.removeClass(parent, className);
      } else {
        for (let i = 0; i < tableOptions.length; i++) {
          let _class = tableOptions[i];
          tinyMCE.activeEditor.dom.removeClass(parent, _class);
        }
        tinyMCE.activeEditor.dom.addClass(parent, className);
      }
    }
    return parent;
  }

  function resetTableButtons() {
    let node = tinyMCE.activeEditor.selection.getNode();
    let parent = tinyMCE.activeEditor.dom.getParent(node, "table");
    let found = false;
    $('.btech-table-edit-option').each(function () {
      $(this).css({
        'background-color': '#eee',
        'color': '#000'
      });
      let className = $(this).attr('id').replace("-button", "");
      if (parent !== null) {
        if ($(parent).hasClass(className)) {
          let bgColor = getComputedStyle(document.documentElement, null).getPropertyValue("--ic-brand-button--secondary-bgd-darkened-5");
          $(this).css({
            'background-color': bgColor,
            'color': '#fff'
          });
          $(this).select();
          found = true;
        }
      }
    });
    //if no options are selected, select the disabled or default option
    if (!found) {
      $('.btech-table-edit-option:disabled').select();
    }
  }

  async function googleSheetsTable() {
    let editor = TOOLBAR.editor;
    let selection = editor.selection;
    let bg = TOOLBAR.addBackground();
    bg.append(`
    <div id='google-sheet-id-container' style='
    width: 500px;
    left: 50%;
    transform: translate(-50%, -50%);
    position:fixed;
    top: 50%;
    z-index:1000;
    transition: 0.5s;
    background-color: #FFF;
    border: 2px solid #888;
    padding: 10px 20px;
    color: #000;
    border-radius: 5px;'>
    Enter Google Sheet Id<br><input style='width: 100%;' type="text" id="google-sheet-id">
    </div>
    </div>`);

    $("#google-sheet-id").keypress(function (event) {
      var keycode = (event.keyCode ? event.keyCode : event.which);
      if (keycode == '13') {
        //*
        editor.execCommand("mceReplaceContent", false, `
<table class="google-sheet-based sheet-` + $(this).val() + `">
<tbody>
<tr>
<td>
{$selection}
</td>
</tr>
</tbody>
</table>`);
        //*/
        bg.remove();
      }
      event.stopPropagation();
    });
  }

  await TOOLBAR.checkReady();
  TOOLBAR.addButtonIcon("far fa-file-spreadsheet", "Insert a table which will be linked to a google sheet. You will need the google sheet id.", googleSheetsTable);
  let select = TOOLBAR.addSelect("tables", "Convert tables to other display options.");
  for (let i = 0; i < tableOptions.length; i++) {
    let className = tableOptions[i];
    let optionName = className.replace("btech-", "").replace("-table", "");
    let option = await TOOLBAR.addSelectOption(optionName, 'tables', '', function () {
      addClassToTable(className);
      resetTableButtons();
    }, 'btech-table-edit-option');
    option.attr('id', className + '-button');
  }

  //whenever you click in the editor, see if it's selected a table with one of the classes
  tinymce.activeEditor.on("click", function () {
    resetTableButtons();
  });
})();