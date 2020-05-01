(function () {
  let originalTables = $(".btech-tab-table");
  originalTables.each(function () {
      let originalTable = $(this);
      let newTable = $("<div class='btech-tabs-container'></div>");
      let newTableTabs = $("<ul style='list-style-type:none;'></ul>");
      let newTableContent = $("<div style='padding: 10px; border-bottom: 1px solid #000; border-right: 1px solid #000; border-left: 1px solid #000;'></div>");
      let rows = originalTable.find("tr");
      let data = {};
      let count = 0;
      let optionHeader = "";
      let valueHeader = "";
      let caption = originalTable.find("caption").html();
      if (caption !== null) {
          newTable.prepend("<div style='width: 100%; text-align: center;'>" + caption + "</div><br>");
      }
      rows.each(function () {
          let row = $(this);
          let cells = row.find("td");
          if (cells.length > 0) {
              let tab = $(cells[0]).text();
              data[tab] = $(cells[1]).html();
              let li = $("<li>"+tab+"</li>");
              li.click(function() {
                newTableContent.html(data[tab]);
                newTableContent.show();
                newTableTabs.find('li').each(function() {
                    $(this).removeClass("active");
                });
                $(this).addClass("active");
            });
              newTableTabs.append(li);
          }
          cells = row.find("th");
          if (cells.length > 0) {
              optionHeader = $(cells[0]).text();
              valueHeader = $(cells[1]).text();
          }
      });
      originalTable.before(newTable);
      newTable.append(newTableTabs);
      newTable.append(newTableContent);
      newTableContent.hide();
      originalTable.hide();
  });
})();