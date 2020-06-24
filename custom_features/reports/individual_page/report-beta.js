/*
  If someone cannot view this report, they needed to be added under the sub-account via:
  Settings->Admins->Add Account Admins
  They only need the View Enrollments level access to be able to see the report.
*/
(function () {
  class Column {
    constructor(name, description, average, sort_type, percent, hideable = true) {
      this.name = name;
      this.description = description;
      this.average = average;
      this.sort_type = sort_type; //needs to be a result of typeof, probably mostly going to be string or number
      this.sort_state = 0; //becomes 1 or -1 depending on asc or desc
      this.visible = true;
      this.percent = percent;
      this.hideable = hideable;
    }
  }
  IMPORTED_FEATURE = {};
  if (true) {
    IMPORTED_FEATURE = {
      initiated: false,
      async _init(params = {}) {
        let vueString = '';
        await $.get('https://jhveem.github.io/custom_features/reports/individual_page/template-beta.vue', null, function (html) {
          vueString = html.replace("<template>", "").replace("</template>", "");
        }, 'text');
        let canvasbody = $("#application");
        canvasbody.after('<div id="canvas-individual-report-vue"></div>');
        $("#canvas-individual-report-vue").append(vueString);
        let gen_report_button;
        if (/^\/courses\/[0-9]+\/users\/[0-9]+$/.test(window.location.pathname)) {
          gen_report_button = $('<a style="cursor: pointer;" id="canvas-individual-report-vue-gen"><i class="icon-gradebook"></i> Courses Report</a>');
        } else {
          gen_report_button = $('<a class="btn button-sidebar-wide" id="canvas-individual-report-vue-gen"><i class="icon-gradebook"></i>Courses Report</a>');
        }
        let menu_bar = $("#right-side div").first();
        let modal = $('#canvas-individual-report-vue');
        gen_report_button.appendTo(menu_bar);
        modal.hide();
        gen_report_button.click(function () {
          let modal = $('#canvas-individual-report-vue');
          modal.show();
        });
        this.APP = new Vue({
          el: '#canvas-individual-report-vue',
          mounted: async function () {
            let gradesBetweenDates = {};
            this.courseId = ENV.context_asset_string.replace("course_", "");
            let match = window.location.pathname.match(/users\/([0-9]+)/);
            this.userId = match[1];
            this.courses = await this.getCourseData();
            this.loading = false;
            for (let i = 0; i < this.courses.length; i++) {
              let courseId = this.courses[i].course_id;
              this.submissionData[courseId] = await this.getSubmissionData(courseId);
              //get assignment group data
              this.courseAssignmentGroups[this.courses[i].course_id] = await canvasGet("/api/v1/courses/" + this.courses[i].course_id + "/assignment_groups", {
                'include': [
                  'assignments'
                ]
              });
            }
            this.loadingAssignments = false;
          },

          data: function () {
            return {
              userId: null,
              gradesBetweenDates: {},
              progressBetweenDates: {},
              courses: {},
              submissionDatesStart: undefined,
              submissionDatesEnd: undefined,
              courseAssignmentGroups: {},
              columns: [
                new Column('Name', '', false, 'string', false, false),
                new Column('State', '', false, 'string', false),
                new Column('Hours', '', false, 'number', false),
                new Column('Grade To Date', '', true, 'number', true),
                new Column('Final Grade', '', true, 'number', true),
                new Column('Points', '', true, 'number', true),
                new Column('Submissions', '', true, 'number', true),
                new Column('Days Since Last Submission', '', true, 'number', false)
              ],
              sections: [],
              courseList: [],
              studentData: [],
              submissionData: {},
              loading: true,
              loadingAssignments: true,
              loadingMessage: "Loading Results...",
              accessDenied: false,
              menu: 'report'
            }
          },
          computed: {
            visibleColumns: function () {
              return this.columns.filter(function (c) {
                return c.visible;
              })
            }
          },
          methods: {
            sumHoursCompleted() {
              let sum = 0;
              for (let c in this.courses) {
                let course = this.courses[c];
                let progress = this.progressBetweenDates[course.course_id];
                if (progress > 0) {
                  sum += Math.round(progress * course.hours) * .01;
                }
              }
              return parseFloat(sum.toFixed(2));
            },
            weightedGradeForTerm() {
              let weightedGrade = 0;
              let totalHoursCompleted = this.sumHoursCompleted();
              for (let c in this.courses) {
                let course = this.courses[c];
                let progress = this.progressBetweenDates[course.course_id];
                let grade = this.gradesBetweenDates[course.course_id];
                if (progress !== undefined && grade !== undefined) {
                  let hoursCompleted = this.getHoursCompleted(course);
                  weightedGrade += (grade * (hoursCompleted / totalHoursCompleted));
                }
              }
              return parseFloat(weightedGrade.toFixed(2));
            },
            async getHoursEnrolled() {

            },
            async weightedGradeWithRequiredHours() {
              //This needs to be created
              //will take the weighted grade and then if the student does not complete at least 66% of the hours enrolled, they will have a reduction in their score based on ammount below that 66%
              let hoursEnrolled = undefined; //needs to be grabbed from the course, wherever it ends up being stored
              let hoursCompleted = this.sumHoursCompleted();
              let weightedGrade = weightedGradeForTerm();
              let minHoursRequired = hoursEnrolled * .66;
              if (hoursCompleted < minHoursRequired) {
                weightedGrade *= (hoursCompleted / minHoursRequired); 
              }
              return weightedGrade;
            },
            getProgressBetweenDates(courseId) {
              let progress = this.progressBetweenDates[courseId];
              if (progress !== undefined) return (progress + "%");
              return "";
            },
            getGradesBetweenDates(courseId) {
              let grade = this.gradesBetweenDates[courseId];
              if (grade !== undefined) return (grade + "%");
              return "";
            },
            getHoursCompleted(course) {
              let progress = this.progressBetweenDates[course.course_id];
              if (progress !== undefined) return parseFloat((Math.round(progress * course.hours) * .01).toFixed(2));
            },
            sortColumn(header) {
              let app = this;
              let name = this.columnNameToCode(header);
              let sortState = 1;
              let sortType = '';
              for (let c = 0; c < app.columns.length; c++) {
                if (app.columns[c].name !== header) {
                  //reset everything else
                  app.columns[c].sort_state = 0;
                } else {
                  //if it's the one being sorted, set it to 1 if not 1, or set it to -1 if is already 1
                  if (app.columns[c].sort_state !== 1) app.columns[c].sort_state = 1;
                  else app.columns[c].sort_state = -1;
                  sortState = app.columns[c].sort_state;
                  sortType = app.columns[c].sort_type;
                }
              }
              app.courses.sort(function (a, b) {
                let aVal = a[name];
                let bVal = b[name];
                //convert strings to upper case to ignore case when sorting
                if (typeof (aVal) === 'string') aVal = aVal.toUpperCase();
                if (typeof (bVal) === 'string') bVal = bVal.toUpperCase();

                //see if not the same type and which one isn't the sort type
                if (typeof (aVal) !== typeof (bVal)) {
                  if (typeof (aVal) !== sortType) return -1 * sortState;
                  if (typeof (bVal) !== sortType) return 1 * sortState;
                }
                //check if it's a string or int
                let comp = 0;
                if (aVal > bVal) comp = 1;
                else if (aVal < bVal) comp = -1;
                //flip it if reverse sorting;
                comp *= sortState;
                return comp
              })
            },
            async calcGradesBetweenDates() {
              let gradesBetweenDates = {};
              let progressBetweenDates = {};
              let startDate = this.parseDate(this.submissionDatesStart);
              let endDate = this.parseDate(this.submissionDatesEnd);
              //break if a date is undefined
              if (startDate === undefined || endDate === undefined) return;

              //otherwise fill in all the progress / grades data for those dates
              for (let i = 0; i < this.courses.length; i++) {
                let courseId = this.courses[i].course_id;
                let subs = this.submissionData[courseId];
                if (subs !== undefined) {
                  let subData = {};
                  for (let s = 0; s < subs.length; s++) {
                    let sub = subs[s];
                    if (sub.posted_at != null) {
                      subData[sub.assignment_id] = sub;
                    }
                  }
                  let assignmentGroups = this.courseAssignmentGroups[courseId];
                  console.log(assignmentGroups);
                  let currentWeighted = 0;
                  let totalWeights = 0; //sum of all weight values for assignment groups
                  let totalWeightsSubmitted = 0; //sum of all weight values for assignment groups if at least one submitted assignment
                  let totalProgress = 0;
                  for (let g = 0; g < assignmentGroups.length; g++) {
                    let group = assignmentGroups[g]
                    if (group.group_weight > 0) {
                      let currentPoints = 0;
                      let possiblePoints = 0;
                      let totalPoints = 0;
                      for (let a = 0; a < group.assignments.length; a++) {
                        let assignment = group.assignments[a];
                        if (assignment.published) {
                          totalPoints += assignment.points_possible;
                          if (assignment.id in subData) {
                            let sub = subData[assignment.id];
                            let subDateString = sub.submitted_at;
                            if (subDateString === null) subDateString = sub.graded_at;
                            let subDate = new Date(subDateString);
                            if (subDate >= startDate && subDate <= endDate) {
                              currentPoints += sub.score;
                              possiblePoints += assignment.points_possible;
                            }
                          }

                        }
                      }
                      if (possiblePoints > 0) {
                        let groupScore = currentPoints / possiblePoints;
                        currentWeighted += groupScore * group.group_weight;
                        totalWeightsSubmitted += group.group_weight;
                      }
                      if (totalPoints > 0) {
                        let progress = possiblePoints / totalPoints;
                        totalProgress += progress * group.group_weight;
                        totalWeights += group.group_weight;
                      }
                    }
                  }
                  if (totalWeights > 0) {
                    let output;
                    let weightedGrade = Math.round(currentWeighted / totalWeights * 10000) / 100;
                    output = "";
                    if (!isNaN(weightedGrade)) {
                      output = weightedGrade;
                    }
                    gradesBetweenDates[courseId] = output;

                    let progress = Math.round((totalProgress / totalWeights) * 10000) / 100;
                    output = "";
                    if (!isNaN(progress)) {
                      output = progress;
                    }
                    progressBetweenDates[courseId] = output;
                  }
                }
              }
              this.gradesBetweenDates = JSON.parse(JSON.stringify(gradesBetweenDates));
              this.progressBetweenDates = JSON.parse(JSON.stringify(progressBetweenDates));

            },
            parseDate(dateString) {
              if (dateString == undefined) return undefined;
              let pieces = dateString.split("-");
              let year = parseInt(pieces[0]);
              let month = parseInt(pieces[1] - 1);
              let day = parseInt(pieces[2]) + 1;
              let date = new Date(year, month, day);
              return date;
            },
            async getSubmissionData(courseId) {
              let subs = await canvasGet("/api/v1/courses/" + courseId + "/students/submissions", {
                'student_ids': [this.userId],
                'include': ['assignment']
              })
              for (let s = 0; s < subs.length; s++) {
                let sub = subs[a];
                let assignment = sub.assignment;
                console.log(assignment.name);
              }
              console.log(subs);
              return subs;
            },
            async newCourse(id, state, name, year) {
              let app = this;
              let course = {};
              course.course_id = id;
              let url = "/api/v1/courses/" + id;
              let hours = "N/A";
              //get course hours if there's a year
              if (year !== null) {
                await $.get(url).done(function (data) {
                  let crsCode = data.course_code;
                  hours = COURSE_HOURS[year][crsCode];
                })
              }
              course.hours = hours;
              course.state = state;
              course.name = name;
              course.days_in_course = 0;
              course.days_since_last_submission = 0;
              course.days_since_last_submission_color = "#fff";
              course.section = "";
              course.grade_to_date = "N/A";
              course.points = 0;
              course.final_grade = "N/A";
              course.section = "";
              course.ungraded = 0;
              course.submissions = 0;
              course.nameHTML = "<a target='_blank' href='" + window.location.origin + "/courses/" + id + "'>" + name + "</a> (<a target='_blank' href='https://btech.instructure.com/courses/" + id + "/grades/" + app.userId + "'>grades</a>)";
              return course;
            },

            async getCourseData() {
              let app = this;
              let courses = [];
              let courseList = await this.getCourses();
              for (let c = 0; c < courseList.length; c++) {
                let course = await app.newCourse(courseList[c].course_id, courseList[c].state, courseList[c].name, courseList[c].year);
                let state = course.state.toLowerCase();
                if (state === "completed") state = "active";
                let gradesData = await app.getCourseGrades(course.course_id, course.state);
                course.grade_to_date = gradesData.grade;
                course.final_grade = gradesData.final_grade;
                course.points = gradesData.points;

                await app.getAssignmentData(course, gradesData.enrollment);
                courses.push(course);
              }
              return courses;
            },

            async getCourses() {
              let app = this;
              let list = [];
              let url = window.location.origin + "/users/" + app.userId;
              await $.get(url).done(function (data) {
                $(data).find("#content .courses a").each(function () {
                  let name = $(this).find('span.name').text().trim();
                  let href = $(this).attr('href');
                  let match = href.match(/courses\/([0-9]+)\/users/);
                  if (match) {
                    let text = $(this).text().trim();
                    let course_id = match[1];
                    let state = text.match(/([A-Z|a-z]+),[\s]+?Enrolled as a Student/)[1];
                    let year = null;
                    let yearData = text.match(/(2[0-9]{3}) /);
                    if (yearData != null) year = yearData[1];
                    list.push({
                      name: name,
                      course_id: course_id,
                      state: state,
                      year: year
                    });
                  }
                });
              }).fail(function (e) {
                console.log(e);
                app.accessDenied = true;
              });
              return list;
            },

            async getCourseGrades(course_id, state) {
              let output = {
                found: false
              };
              let app = this;
              let user_id = app.userId;
              let url = "/api/v1/courses/" + course_id + "/search_users?user_ids[]=" + user_id + "&enrollment_state[]=" + state.toLowerCase() + "&include[]=enrollments";
              await $.get(url, function (data) {
                if (data.length > 0) {
                  output.found = true;
                  let enrollment = data[0].enrollments[0];
                  output.enrollment = enrollment;
                  let grades = enrollment.grades;
                  if (grades !== undefined) {
                    let grade = grades.current_score;
                    if (grade == null) {
                      if (state == "active") grade = 0;
                      else grade = "N/A";
                    }
                    output.grade = grade;

                    let final_grade = enrollment.grades.final_score;
                    if (final_grade == null) final_grade = 0;
                    if (grade == "N/A" && final_grade == 0) final_grade = "N/A";
                    output.final_grade = final_grade;

                    let points = "N/A";
                    if (!isNaN(parseInt(final_grade)) && !isNaN(parseInt(final_grade))) {
                      points = Math.round(final_grade / grade * 100);
                      if (isNaN(points)) points = 0;
                    }
                    output.points = points;
                  }
                }
              });
              if (output.found === false && state === "active") {
                output = await app.getCourseGrades(course_id, 'completed');
              }
              return output;
            },

            columnNameToCode(name) {
              return name.toLowerCase().replace(/ /g, "_");
            },

            getColumnText(column, course) {
              let text = course[this.columnNameToCode(column.name)];
              if (column.name === "Name") {
                text = course.nameHTML;
              }
              if (column.percent && !isNaN(text)) {
                text += "%";
              }
              return text;
            },

            getDaysSinceLastSubmissionColor(column, val) {
              color = "#FFF";
              if (column === "Days Since Last Submission") {
                if (val >= 7 && val <= 21) {
                  let g = 16 - Math.floor(((val - 6) / 15) * 16);
                  if (g < 6) g = 6;
                  color = "#F" + g.toString(16) + "7";
                }
                if (val > 21) color = "#F67";
              }
              return color;
            },

            async getAssignmentData(course, enrollment) {
              let app = this;
              let course_id = course.course_id;
              let user_id = app.userId;
              let url = "/api/v1/courses/" + course_id + "/analytics/users/" + user_id + "/assignments";
              if (enrollment === undefined) return;
              try {
                await $.get(url).done(function (data) {
                  course.assignments = data;
                  let assignments = data;
                  let total_points_possible = 0;
                  let current_points_possible = 0;
                  let most_recent = {};
                  let submitted = 0;
                  let max_submissions = 0;
                  let progress_per_day = 0;
                  let start_date = Date.parse(enrollment.created_at);
                  let now_date = Date.now();
                  let diff_time = Math.abs(now_date - start_date);
                  let diff_days = Math.ceil(diff_time / (1000 * 60 * 60 * 24));
                  let most_recent_time = diff_time;
                  for (let a = 0; a < assignments.length; a++) {
                    let assignment = assignments[a];
                    let points_possible = assignment.points_possible;
                    let submitted_at = Date.parse(assignment.submission.submitted_at);
                    total_points_possible += points_possible;
                    if (assignment.points_possible > 0) {
                      max_submissions += 1;
                      if (assignment.submission.score !== null) {
                        current_points_possible += points_possible;
                        submitted += 1;
                      }
                    }
                    if (Math.abs(now_date - submitted_at) < most_recent_time) {
                      most_recent_time = Math.abs(now_date - submitted_at);
                      most_recent = assignment;
                    }
                  }
                  let perc_submitted = Math.round((submitted / max_submissions) * 100);
                  if (isNaN(perc_submitted)) perc_submitted = 0;
                  course.submissions = perc_submitted;

                  //calculate color for last submission day
                  let most_recent_days = Math.ceil(most_recent_time / (1000 * 60 * 60 * 24));
                  if (course.state === 'Active') {
                    course.days_since_last_submission = most_recent_days;
                  } else if (course.state == 'Completed') {
                    course.days_since_last_submission = "Complete";
                    course.points = 100;
                  } else {
                    course.days_since_last_submission = "N/A";
                    course.points = "N/A";
                  }
                })
              } catch (e) {
                console.log(e);
              }
            },

            processEnrollment(student, enrollment) {
              let start_date = Date.parse(enrollment.created_at);
              let now_date = Date.now();
              let diff_time = Math.abs(now_date - start_date);
              let diff_days = Math.ceil(diff_time / (1000 * 60 * 60 * 24));
              let grades = enrollment.grades;
              let current_score = grades.current_score;
              if (current_score === null) current_score = 0;
              let final_score = grades.final_score;
              if (final_score === null) final_score = 0;

              //update values
              student.days_in_course = diff_days;
              student.grade = current_score;
              student.final_grade = final_score;
              //there might need to be a check to see if this is a numbe
              if (student.grade > 0 && student.grade != null) {
                student.points = Math.round(student.final_grade / student.grade * 100);
              }
            },

            close() {
              $(this.$el).hide();
            }

          }
        })
      },
      APP: {}
    }
  }
})();