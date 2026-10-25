/**
 * Ekagra Library: send Google Form responses to the website.
 *
 * Paste this into each form (registration and payment):
 *   1. Open the form > ⋮ (More) > Apps Script. Replace everything with this file.
 *   2. Set FORM, SITE and SECRET below. Save.
 *   3. Triggers (clock icon) > Add trigger > function "onSubmit",
 *      event source "From form", event type "On form submit" > Save, and
 *      allow the permissions it asks for (Drive, external requests).
 *   4. Submit a test response; it appears in the admin under Form submissions.
 *
 * Question titles the website understands (case and punctuation don't matter):
 *   Registration: Full name, Primary mobile, Secondary mobile, Email, Address,
 *     Studying or working in, Preparing for, Aadhaar number, PAN number,
 *     Driving licence number, Consent; files: Student photo, Aadhaar card,
 *     PAN card, Driving licence.
 *   Payment: Full name, Primary mobile, Amount paid, Months paid for,
 *     Payment date, Paid by; file: Payment screenshot.
 */

const FORM = "registration"; // "registration" or "payment"
const SITE = "https://your-domain/api/intake/google-forms";
const SECRET = "paste the INTAKE_SECRET value here";
const MAX_SIDE = 1600; // large photos are resized to this many pixels on the long side

function onSubmit(e) {
  const response = e.response;
  const responseId = response.getId();
  const answers = {};
  const uploads = [];

  response.getItemResponses().forEach(function (r) {
    const item = r.getItem();
    if (item.getType() === FormApp.ItemType.FILE_UPLOAD) {
      (r.getResponse() || []).forEach(function (id) {
        uploads.push({ question: item.getTitle(), id: id });
      });
    } else {
      answers[item.getTitle()] = r.getResponse();
    }
  });

  // The answers first, then each file on its own (the site limits one request to ~4 MB).
  post({ kind: "submission", form: FORM, responseId: responseId, submittedAt: response.getTimestamp().toISOString(), answers: answers });

  uploads.forEach(function (u) {
    const file = DriveApp.getFileById(u.id);
    let blob = file.getBlob();
    // Phone photos can be several MB: ask Drive for a resized copy.
    if (blob.getContentType().indexOf("image/") === 0 && blob.getBytes().length > 900000) {
      const thumb = UrlFetchApp.fetch("https://drive.google.com/thumbnail?sz=w" + MAX_SIDE + "&id=" + u.id, {
        headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true,
      });
      if (thumb.getResponseCode() === 200 && thumb.getBlob().getContentType().indexOf("image/") === 0) blob = thumb.getBlob();
    }
    post({
      kind: "file",
      form: FORM,
      responseId: responseId,
      question: u.question,
      name: file.getName(),
      type: blob.getContentType(),
      data: Utilities.base64Encode(blob.getBytes()),
    });
  });
}

function post(payload) {
  const res = UrlFetchApp.fetch(SITE, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) {
    console.error("Ekagra Library: " + payload.kind + " failed (" + res.getResponseCode() + "): " + res.getContentText());
  }
}
