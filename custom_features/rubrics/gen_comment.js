(function() {
  IMPORTED_FEATURE = {};
  let rWindowSpeedGrader = /^\/courses\/[0-9]+\/gradebook\/speed_grader/;
  let rWindowVanilla = /^\/courses\/[0-9]+\/assignments\/[0-9]+\/submissions\/[0-9]+/;
  if (rWindowSpeedGrader.test(window.location.pathname) && rWindowSpeedGrader.test(window.location.pathname)) {
    IMPORTED_FEATURE = {
      courseId: null,
      assignmentId: null,
      studentId: null,
      initiated: false,
      _init() {
        let feature = this;
        if (rWindowSpeedGrader.test(window.location.pathname)) {
          feature.courseId = parseInt(ENV.course_id);
          feature.studentId = ENV.RUBRIC_ASSESSMENT.assessment_user_id;
          console.log(feature.studentId);
          feature.assignmentId = ENV.assignment_id;
        }

        if (rWindowVanilla.test(window.location.pathname)) {
          let rPieces = /^\/courses\/([0-9]+)\/assignments\/([0-9]+)\/submissions\/([0-9]+)/;
          let pieces = window.location.pathname.match(rPieces);
          feature.courseId = parseInt(pieces[1]);
          feature.studentId = parseInt(pieces[3]);
          feature.assignmentId = parseInt(pieces[2]);
        }
        $(".save_rubric_button").on("click", function() {
          feature.genRubricComment("div#rubric_full", 2);
        });
      },

      genRubricComment(rubricSelector, offset=1) {
        let feature = this;
        let comment = "";
        let header = "<h2><b>RUBRIC</b></h2>";
        let totalMax = 0;
        let totalCrit = 0;
        header += ($("#rubric_holder").find("[data-selenium='rubric_total']").text() + "\n");
        $(rubricSelector).find("tr.rubric-criterion").each(function() {
          let description = $(this).find("th.description-header").find("div.description").text();
          let points_val = $(this).find("td.criterion_points").find("div.graded-points").find("input").val();
          let points = $(this).find("td.criterion_points").find("div.graded-points").text();
          points = points.replace("/", "").replace(" pts", "").replace("Points", "");
          totalCrit += 1;
          points = ("" + points).trim();
          points_val = ("" + points_val).trim();
          if (points === points_val) {
            totalMax += 1;
          }
          description = description.replace("This criterion is linked to a Learning Outcome", "");
          comment += (description + "\n" + points_val + "/" + points + "\n");
        });
        header += ("Total Criteria at Full Points: " + totalMax + "/" + totalCrit);
        comment = header + '\n<div class="btech-comment-collapse">\n' + comment + '\n</div>';
        let url = "/api/v1/courses/"+feature.courseId+"/assignments/"+feature.assignmentId+"/submissions/"+feature.studentId;
        $.put(url,{
          comment:{
            text_comment: comment
          }
        });
      }
    }
  }
})();