(async function () {
  //https://btech.instructure.com/courses/420675/assignments/4484718
  function hashId(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      let chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }

  function addHidden(inputId, value) {
    form.append(`<input type="hidden" name="` + inputId + `" value="` + value + `">`);
  }

  function addParagraphTextEntry(inputId, description) {
    form.append(`
<p>` + description + `<br>
<textarea name="` + inputId + `" style="width:100%; box-sizing: border-box;"></textarea>
</p>
`)
  }

  function addTextEntry(inputId, description) {
    form.append(`
<p>` + description + `<br>
<input type="text" name="` + inputId + `" value="">
</p>
`)
  }

  function addDropdown(inputId, description, list) {
    let input = $(`<p>` + description + `</p>`);
    let bodyRows = "";
    let select = $(`
<select name='` + inputId + `'>
<option value="" disabled selected>Select your option</option>
</select>
`);
    for (var i = 0; i < list.length; i++) {
      select.append(`<option value="` + list[i] + `">` + list[i] + `</option>`);
    }
    input.append("<br>");
    input.append(select);
    form.append(input);
  }

  function addButtons(inputId, description, list = [1, 2, 3, 4, "N/A"]) {
    let buttonWidth = (100 - 20) / list.length;
    let headingRows = "";
    let bodyRows = "";
    for (var i = 0; i < list.length; i++) {
      headingRows += `<td style="width:` + buttonWidth + `%;text-align:center;"><label>` + list[i] + `</label></td>`;
      bodyRows += `
<td style="width:` + buttonWidth + `%;text-align:center;color:#666;border-bottom:1px solid #d3d8d3;padding:0">
<label style="display:block">
<div style="padding:.5em .25em"><input type="radio" name="` + inputId + `" value="` + list[i] + `" role="radio" aria-label="` + list[i] + `"></div>
</label>
</td>`;
    }
    form.append(`
<p>` + description + `</p>

<table border="0" cellpadding="5" cellspacing="0">
<thead>
<tr>
<td>
</td>` +
      headingRows +
      `</tr>
</thead>
<tbody>
<tr role="radiogroup" aria-label="" aria-describedby="1978569583_errorMessage"
style="text-align:center;color:#666;border-bottom:1px solid #d3d8d3;padding:0;background-color:#f2f2f2">
<td
style="text-align:left;color:#666;border-bottom:1px solid #d3d8d3;padding:0;min-width:100px;max-width:200px;padding-left:15px">
</td>
` + bodyRows + `
</tr>
</tbody>
</table>
`);
  }

  function addSubmitButton() {
    let submit = $('<input type="submit" name="submit" value="Submit" id="m_8914134288611702631ss-submit">');
    submit.click(function () {
      location.reload(true);
    })
    form.append('<br><br>');
    form.append(submit);
  }

  //Can probably get rid of the ids
  let form = $(`
<form
action="https://docs.google.com/forms/u/0/d/e/1FAIpQLSffvo5Uap6vY_DFz8x9nv7Evo7OnczEOtJXqWyzLNBnlmOhZQ/formResponse"
method="POST" id="m_8914134288611702631ss-form"
target="_blank"
</form>
`);
//target="formSubmitFrame">
  //get the container
  let container = $('.btech-survey');
  container.removeClass('btech-hidden'); //make it not hidden
  let loading = $("<p>Loading Survey...</p>");
  container.empty();
  container.append(loading);
  let classes = container.attr('class').split(/\s+/);
  
  //get the form id
  let formId = "";
  for (var c = 0; c < classes.length; c++) {
    try {
      formId = classes[c].match(/^form\-(.*)/)[1];
    } catch (e) {}
  }

  //request the form data
  if (formId !== "") {
    var url = "https://script.google.com/a/btech.edu/macros/s/AKfycbwIgHHMYbih2XnJf7mjDw8g3grdeHhn9s6JIvH6Qg7mfZ0ElbWr/exec?formId=" + formId;
    let formData = null;
    await jQuery.ajax({
      crossDomain: true,
      url: url,
      method: "GET",
      dataType: "jsonp"
    }).done(function (res) {
      formData = res;
    });
    console.log(formData);

    //grab some default data
    let courseId = ENV.COURSE_ID;
    let userId = ENV.current_user.id;
    container.append(form);
    //add the iframe which will hold the submission
    container.append("<iframe name='formSubmitFrame' title='holds submitted form data' rel='nofollow' class='btech-hidden'></iframe>");

    //get a list of instructors
    //MAKE THIS REQUEST CONDITIONAL ON WHETHER OR NOT IT IS EVEN NEEDED
    let instructors = [];
    await $.get("/api/v1/courses/" + courseId + "/enrollments?type[]=TeacherEnrollment&type[]=TaEnrollment").done(function (data) {
      for (let i = 0; i < data.length; i++) {
        let enrollment = data[i];
        instructors.push(enrollment.user.name);
      }
    });

    //done loading
    loading.remove();

    //Add in the survey data
    for (let i = 0; i < formData.length; i++) {
      let item = formData[i];
      //Set up prefilled hidden items
      if (item.title == "COURSE") addHidden(item.entry[0], CURRENT_COURSE_ID); //course
      else if (item.title == "USER") addHidden(item.entry[0], hashId(userId)); //course
      else if (item.title == "PROGRAM") addHidden(item.entry[0], CURRENT_DEPARTMENT_ID); //course
      else if (item.title == "INSTRUCTOR") addDropdown(item.entry[0], "Enter the name of your instructor.", instructors);
      //add based on question type
      //MUST MANUALLY ADD IN EACH QUESTION TYPE HERE AND ALSO MAKE SURE IT IS SET UP IN THE GOOGLE SCRIPTS PAGE OR THE DATA WON'T GET SENT
      else {
        for (let e = 0; e < item.entry.length; e++) {
          let entry = item.entry[e];
          switch (item.type) {
            case "TEXT":
              addTextEntry(entry, item.title);
              break;
            case "PARAGRAPH_TEXT":
              addParagraphTextEntry(entry, item.title);
              break;
            case "GRID":
              addButtons(entry, item.title, item.answers);
              break;
          }
        }
      }
    }

    addSubmitButton();
  }
})();