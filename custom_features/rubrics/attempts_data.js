(function() {
  IMPORTED_FEATURE = {};
  let rWindowSpeedGrader = /^\/courses\/[0-9]+\/gradebook\/speed_grader/;
  let rWindowVanilla = /^\/courses\/[0-9]+\/assignments\/[0-9]+\/submissions\/[0-9]+/;
  if (rWindowSpeedGrader.test(window.location.pathname) || rWindowVanilla.test(window.location.pathname)) {
    IMPORTED_FEATURE = {
      attempts: 0,
      initiated: false,
      commentSelector: "",
      _init(params={}) {
        let feature = this;
        if (rWindowSpeedGrader.test(window.location.pathname)) {
          feature.commentSelector = "div.comment span.comment, tr.comments";
        }
        if (rWindowVanilla.test(window.location.pathname)) {
          feature.commentSelector = "div.comment div.comment span";
        }
        feature.insertAttemptsData();
        $(".save_rubric_button").on("click", function() {
          feature.calcAttemptsData();
          feature.attempts += 1;
        });
      },
      async insertAttemptsData() {
        let feature = this;
        let details = await getElement("#rubric_holder tbody.criterions");
        details.after(
          `<tr id="btech-attempts-data" class="content_box">
          <td colspan="3">
          <div id="btech-recorded-attempts"><b>Recorded Attempts:</b> <span id="btech-recorded-attempts-value"></span></div>
          <div id="btech-rubric-score"><b>Rubric Score:</b> <span id="btech-rubric-score-value"></span></div>
          <div id="btech-suggested-score"><b>Suggested Score:</b> <span id="btech-suggested-score-value"></span></div>
          </td>
          </tr>`);
        feature.calcAttemptsData();
      },
      async calcAttemptsData() {
        let feature = this;
        feature.attempts = 0;
        let elements = await getElement(feature.commentSelector);
        elements.each(function() {
            let checkAttempt = $(this).html().includes("RUBRIC");
            if (checkAttempt) {
                feature.attempts += 1;
            }
        });
        if (feature.attempts > 0) {
          let rubricTotalText = $("[data-selenium='rubric_total']").text();
          console.log(rubricTotalText);
          let match = rubricTotalText.match(/([0-9]+)/);
          rubricTotal = parseInt(match[1]);
          rubricMax = parseInt(rubricTotalText.match(/([0-9]+)/)[2]);
          console.log(rubricMax);
          let suggestedScore = Math.round(rubricTotal * ((11 - feature.attempts) / 10));
          $("#btech-recorded-attempts-value").text(feature.attempts);
          $("#btech-rubric-score-value").text(rubricTotal);
          $("#btech-suggested-score-value").text(suggestedScore);
        }
      }
    }
  }
})();