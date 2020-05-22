TOOLBAR = {
  tableOptions: [
    'btech-tabs-table',
    'btech-dropdown-table'
  ],

  editor: null,
  toolbar: null,

  async getEditor() {
    if (window.tinymce === undefined) {
      await delay(500);
      return getEditor();
    } else {
      return tinymce.activeEditor;
    }
  },
 
  async checkReady() {
    if (this.editor === null) {
      await delay(500);
      return this.checkReady();
    } else {
      return;
    }
  },

  addBackground() {
    let bg = $(`
      <div style="
        overflow: auto; 
        position: fixed; 
        background-color: rgba(0, 0, 0, 0.5); 
        width: 100%; 
        height: 100%; 
        left: 0; 
        top: 0; 
        z-index:1000;
      ">
        <div id='background-container' style='
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
          border-radius: 5px;
        '>
        </div>
      </div>
      `);
    $("body").append(bg);
    this.addBackgroundClosing(bg);
    return bg;
  },

  //This needs to be called after all children are added to the backround otherwise it'll close on click anywhere.
  addBackgroundClosing(bg) {
    bg.click(function (e) {
      if (e.target !== this)
        return;
      $(this).remove();
    });
  },

  
  async googleSheetsTable() {
    let editor = await getEditor();
    let selection = editor.selection;
    let bg = addBackground();
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
  },
  

  async addButton(name, func, className = '') {
    let customButtonsContainer = $("#btech-custom-editor-buttons-container");
    let button = $("<a class='btn " + className + "' style='padding: 5px; background-color: #EEE; color: #000; border: 1px solid #AAA; cursor: pointer;'>" + name + "</a>");
    button.click(func);
    customButtonsContainer.append(button);
    return button;
  },
  async addButtonIcon(icon, description, func, className = '') {
    let customButtonsContainer = $("#btech-custom-editor-buttons-container");
    let button = $("<div title='" + description + "' style='padding: 4px 8px; color: #000; cursor: pointer;'><i style='font-size: 1rem;' class='" + icon + " " + className + "'></i></a>");
    button.click(func);
    customButtonsContainer.append(button);
    return button;
  },
  
  

  
  async _init() {
    this.editor = await getEditor();
    let topPart = null;
    if (tinymce.majorVersion === "4") {
      topPart = await getElement(".mce-top-part");
    } else if (tinymce.majorVersion === "5") {
      topPart = await getElement(".edit-header");
    }
    if (topPart !== null && $("#btech-custom-editor-buttons-container").length === 0) {
      // this.editor.addShortcut("ctrl+alt+h", "The highlighted font will be hidden until the reader highlights it.", hideOnHover);
      // this.editor.addShortcut("ctrl+alt+e", "the highlighted font will be put inside of an emphasis box.", exampleBox);
      // this.editor.addShortcut("ctrl+alt+d", "the highlighted font will display a definition on hover.", exampleBox);
      // this.editor.addShortcut("ctrl+alt+g", "Insert a table that is linked to a google sheet.", googleSheetsTable);
      // this.editor.addShortcut("ctrl+alt+q", "Insert a citation.", googleSheetsTable);
      this.toolbar = $("<div id='btech-custom-editor-buttons-container'></div>")
      topPart.after(this.toolbar);
      // addButtonIcon("far fa-file-spreadsheet", "Insert a table which will be linked to a google sheet. You will need the google sheet id.", googleSheetsTable);
    }
  }
}
if (window.location.pathname.includes("edit")) TOOLBAR._init();