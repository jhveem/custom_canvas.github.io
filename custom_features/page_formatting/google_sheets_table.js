async function _init() {
  let isEditing = window.location.pathname.includes("/edit");
  if (!isEditing) {
    console.log("GET STUFF");
    var sheetId = '';
    let table = $(".google-sheet-based");
    table.css({
      "layout": "auto",
    });
    let classes = table.attr('class').split(/\s+/);
    for (var c = 0; c < classes.length; c++) {
      try {
        sheetId = classes[c].match(/^sheet\-(.*)/)[1];
      } catch (e) {}
    }
    var url = "https://script.google.com/macros/s/AKfycbzhlxe1absfbAV8-jtLIqOhy_qFcfAa2igje1FHJQYMNSRGNuUs/exec?sheetId=" + sheetId;
    var request = jQuery.ajax({
      crossDomain: true,
      url: url,
      method: "GET",
      dataType: "jsonp"
    }).done(function (res) {
      let rows = table.find("tr");
      rows.each(function () {
        let row = $(this);
        let materialNameCell = $(row.find('td')[0]);
        materialNameCell.css({
          "width": ""
        });
        let materialName = materialNameCell.text().toLowerCase().trim();
        let materialData = res.data[materialName];
        for (let k = 0; k < Object.keys(materialData).length; k++) {
          let key = Object.keys(materialData)[k];
          if (key === "#url#") {
            materialNameCell.wrapInner("<a href='" + materialData[key] + "' target='#'></a>")
          } else if (key === "#image#") {
            row.append("<td><img style='max-height: 200px; max-width: 200px;' src='" + materialData[key] + "'></td>");
          } else {
            row.append("<td><p><strong>" + key + "</strong></p><p>" + materialData[key] + "</p></td>");
          }
        }
      });
    });
  }
}
_init();