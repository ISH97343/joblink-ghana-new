(() => {
  "use strict";

  // JobLink Ghana — Supabase configuration
  const SUPABASE_URL = "https://wqhhirteexkrwgquziol.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_dwQLRteB4O6lfQDlBNBTyQ_yRFUjRne";

  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");
  const year = document.getElementById("year");

  const form = document.getElementById("jobSearchForm");
  const input = document.getElementById("jobSearch");
  const status = document.getElementById("searchStatus");
  const jobsState = document.getElementById("jobsState");
  const clear = document.getElementById("clearSearch");

  const registrationForm = document.getElementById(
    "organisationRegisterForm"
  );
  const registrationStatus = document.getElementById(
    "organisationRegisterStatus"
  );

  if (year) year.textContent = new Date().getFullYear();

  // Mobile navigation
  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      const open = mainNav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(open));
    });

    mainNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mainNav.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Job search interface
  if (form && input && status && jobsState) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = input.value.trim();
      status.textContent = query ? `Search requested: “${query}”` : "Enter a job title or keyword to begin.";
      
      const heading = jobsState.querySelector("h3");
      const paragraph = jobsState.querySelector("p");

      if (heading) {
        heading.textContent = query ? `Ready to search for “${query}”` : "Job listings will appear here";
      }

      if (paragraph) {
        paragraph.textContent = query
          ? "The website is responding. Live results will be enabled when the job database is connected."
          : "This starter website is ready to connect to your JobLink Ghana database.";
      }
    });
  }

  if (clear && input && status && jobsState) {
    clear.addEventListener("click", () => {
      input.value = "";
      status.textContent = "Your job search starts here.";
      
      const heading = jobsState.querySelector("h3");
      const paragraph = jobsState.querySelector("p");

      if (heading) heading.textContent = "Job listings will appear here";
      if (paragraph) {
        paragraph.textContent = "This starter website is ready to connect to your JobLink Ghana database.";
      }
    });
  }

  // Check that the Supabase library loaded.
  if (!window.supabase?.createClient) {
    if (registrationStatus) {
      registrationStatus.textContent =
        "The registration service could not load. Refresh the page and try again.";
    }
    console.error("Supabase JavaScript library is unavailable.");
    return;
  }

  const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  function setRegistrationStatus(message, isError = false) {
    if (!registrationStatus) return;

    registrationStatus.textContent = message;
    registrationStatus.setAttribute(
      "aria-live",
      isError ? "assertive" : "polite"
    );
    registrationStatus.style.color = isError ? "#b42318" : "";
  }

  function friendlyError(error) {
    const message = String(error?.message || "");

    if (/already registered|already exists/i.test(message)) {
      return "This email may already have an account. Do not register repeatedly. Check your inbox and spam folder for the confirmation email.";
    }

    if (/row-level security|permission denied|not allowed/i.test(message)) {
      return "Your account was recognised, but the database blocked organisation setup. Your administrator needs to check the existing Supabase security policies.";
    }

    if (/email rate limit|rate limit/i.test(message)) {
      return "Too many attempts were made. Please wait before trying again.";
    }

    return message || "An unexpected error occurred. Please try again.";
  }

  // Complete setup only for a signed-in, confirmed account.
  async function finishOrganisationSetup(user) {
    const metadata = user.user_metadata || {};

    const name = String(metadata.joblink_org_name || "").trim();
    const description = String(
      metadata.joblink_org_description || ""
    ).trim();
    const contactEmail = String(
      metadata.joblink_org_contact_email || user.email || ""
    ).trim();

    if (!name || !contactEmail) return;

    setRegistrationStatus("Your email is confirmed. Setting up your organisation…");

    const { data: existingOrg, error: lookupError } = await supabase
      .from("organizations")
      .select("id, status")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();

    if (lookupError) throw lookupError;

    let organizationId;

    if (existingOrg) {
      organizationId = existingOrg.id;
    } else {
      const { data: newOrg, error: createError } = await supabase
        .from("organizations")
        .insert({
          name: name,
          description: description || null,
          contact_email: contactEmail,
          owner_id: user.id,
          status: "pending"
        })
        .select("id")
        .single();

      if (createError) throw createError;
      organizationId = newOrg.id;
    }

    const { data: membership, error: membershipLookupError } =
      await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (membershipLookupError) throw membershipLookupError;

    if (!membership) {
      const { error: membershipInsertError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: organizationId,
          user_id: user.id,
          member_role: "admin"
        });

      if (membershipInsertError) throw membershipInsertError;
    }

    setRegistrationStatus(
      `Organisation "${name}" is registered. Its status remains pending until the required approval process is completed.`
    );

    if (registrationForm) {
      registrationForm.reset();
    }
  }

  // Register an organisation owner using Supabase Auth.
  if (registrationForm) {
    registrationForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const name = document
        .getElementById("organisationName")
        ?.value.trim();

      const email = document
        .getElementById("organisationEmail")
        ?.value.trim();

      const description = document
        .getElementById("organisationDescription")
        ?.value.trim() || "";

      const password = document
        .getElementById("organisationPassword")
        ?.value;

      if (!name || !email || !password) {
        setRegistrationStatus(
          "Please complete the organisation name, email and password fields.",
          true
        );
        return;
      }

      if (password.length < 8) {
        setRegistrationStatus(
          "Your password must contain at least 8 characters.",
          true
        );
        return;
      }

      const submitButton = registrationForm.querySelector(
        'button[type="submit"]'
      );

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Creating account…";
      }

      setRegistrationStatus("Creating your account securely…");

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              joblink_org_name: name,
              joblink_org_description: description,
              joblink_org_contact_email: email
            }
          }
        });

        if (error) throw error;

        if (data.session && data.user) {
          await finishOrganisationSetup(data.user);
        } else {
          setRegistrationStatus(
            "Your account has been created. Check your email and click the Supabase confirmation link. You will return to JobLink Ghana to complete organisation setup. Check your spam folder if necessary."
          );
        }
      } catch (error) {
        console.error("Organisation registration error:", error);
        setRegistrationStatus(friendlyError(error), true);
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Create organisation account";
        }
      }
    });
  }

  supabase.auth.getSession().then(async ({ data, error }) => {
    if (error) {
      console.error("Could not check the Supabase session:", error);
      return;
    }

    if (data.session?.user) {
      try {
        await finishOrganisationSetup(data.session.user);
      } catch (setupError) {
        console.error("Organisation setup error:", setupError);
        setRegistrationStatus(
          "Your email is confirmed, but organisation setup did not finish. " +
          friendlyError(setupError),
          true
        );
      }
    }
  });

  console.info("JobLink Ghana loaded successfully.");
})();
