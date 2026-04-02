import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SectionHeading from "../components/SectionHeading";
import { useAuth } from "../context/AuthContext";
import {
  cancelCurrentSubscription,
  createRazorpayCheckout,
  getCurrentSubscription,
  getPlans,
  verifyRazorpaySubscription,
} from "../lib/api";

const planFeatures = {
  monthly: [
    "Flexible recurring access",
    "Eligible for score entry and draw participation",
    "Switch to live or demo membership instantly",
  ],
  yearly: [
    "Discounted annual pricing",
    "Continuous eligibility without monthly interruptions",
    "Best fit for active recurring members",
  ],
};

function loadRazorpayScript() {
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function SubscribePage() {
  const { isAuthenticated } = useAuth();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [status, setStatus] = useState({
    loading: true,
    saving: false,
    error: "",
    success: "",
  });

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getPlans(),
      isAuthenticated ? getCurrentSubscription() : Promise.resolve({ subscription: null }),
    ])
      .then(([planData, subscriptionData]) => {
        if (!isMounted) {
          return;
        }

        setPlans(planData);
        setSubscription(subscriptionData.subscription);
        setStatus({
          loading: false,
          saving: false,
          error: "",
          success: "",
        });
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setStatus({
          loading: false,
          saving: false,
          error: "Subscription data could not be loaded.",
          success: "",
        });
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  async function handleCheckout(planId) {
    setStatus((current) => ({
      ...current,
      saving: true,
      error: "",
      success: "",
    }));

    try {
      const response = await createRazorpayCheckout(planId);
      const checkout = response.checkout;

      if (checkout.mode === "demo") {
        setSubscription(checkout.subscription);
        setStatus((current) => ({
          ...current,
          saving: false,
          success:
            checkout.message ||
            "Demo subscription activated successfully while payment checkout is still being configured.",
        }));
        return;
      }

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        throw new Error("Unable to load Razorpay Checkout.");
      }

      const razorpay = new window.Razorpay({
        key: checkout.razorpayKeyId,
        subscription_id: checkout.id,
        name: "Drive For Good",
        description: `${planId} membership`,
        handler: async (paymentResponse) => {
          try {
            const verified = await verifyRazorpaySubscription(
              paymentResponse.razorpay_subscription_id
            );
            setSubscription(verified.subscription);
            setStatus((current) => ({
              ...current,
              saving: false,
              success: "Razorpay authorization completed successfully.",
            }));
          } catch (error) {
            setStatus((current) => ({
              ...current,
              saving: false,
              error:
                error.message ||
                "Razorpay payment finished, but subscription sync could not be verified yet.",
            }));
          }
        },
        modal: {
          ondismiss: () => {
            setStatus((current) => ({
              ...current,
              saving: false,
              error: "Razorpay checkout was cancelled before completion.",
            }));
          },
        },
        prefill: {
          name: checkout.user?.name,
          email: checkout.user?.email,
        },
        notes: {
          planId: checkout.planId,
        },
        theme: {
          color: "#f1683a",
        },
      });

      razorpay.open();
    } catch (error) {
      setStatus((current) => ({
        ...current,
        saving: false,
        error: error.message || "Unable to start Razorpay checkout.",
      }));
    }
  }

  async function handleCancel() {
    setStatus((current) => ({
      ...current,
      saving: true,
      error: "",
      success: "",
    }));

    try {
      const response = await cancelCurrentSubscription();
      setSubscription(response.subscription);
      setStatus((current) => ({
        ...current,
        saving: false,
        success: response.subscription?.cancelAtPeriodEnd
          ? "Subscription will cancel at the end of the billing period."
          : "Subscription cancelled.",
      }));
    } catch (error) {
      setStatus((current) => ({
        ...current,
        saving: false,
        error: error.message || "Unable to cancel subscription.",
      }));
    }
  }

  return (
    <div className="stack-page">
      <section className="page-banner">
        <SectionHeading
          eyebrow="Subscription plans"
          title="A premium membership flow that works now and scales into live payments later"
          description="The current build supports a real Razorpay path when configured and a graceful demo mode when you want the platform to stay fully explorable."
        />
      </section>

      {isAuthenticated ? (
        <section className="membership-shell">
          <article className="content-card content-card-accent">
            <p className="eyebrow">Current membership</p>
            <h3>{subscription?.planLabel || "No active plan"}</h3>
            <p>
              Status: {subscription?.status || "inactive"}
              {subscription?.renewalDate ? ` · Renews on ${subscription.renewalDate}` : ""}
            </p>
          </article>
          <article className="content-card membership-actions">
            <p className="eyebrow">Lifecycle control</p>
            <h3>Pause, change, or re-enter when you need to.</h3>
            <p>
              The subscription layer already handles renewal state, restricted access,
              and cancellation transitions across the app.
            </p>
            <button
              className="button button-ghost"
              type="button"
              onClick={handleCancel}
              disabled={status.saving || !subscription?.planId}
            >
              {status.saving ? "Working..." : "Cancel subscription"}
            </button>
          </article>
        </section>
      ) : (
        <section className="membership-shell">
          <article className="content-card content-card-accent">
            <p className="eyebrow">Member access required</p>
            <h3>Create an account before you activate a plan.</h3>
            <p>Your membership needs to attach to a real user profile so scores, draws, and charity choices stay linked.</p>
          </article>
          <article className="content-card membership-actions">
            <p className="eyebrow">Fast start</p>
            <div className="hero-actions">
              <Link to="/signup" className="button button-primary">
                Create account
              </Link>
              <Link to="/login" className="button button-secondary">
                Log in
              </Link>
            </div>
          </article>
        </section>
      )}

      <div className="plan-grid">
        {plans.map((plan) => (
          <article key={plan.id} className={`plan-card plan-card-${plan.id}`}>
            <div className="plan-head">
              <span className="pill">{plan.id === "yearly" ? "Best value" : "Flexible entry"}</span>
              <h3>{plan.name}</h3>
              <div className="price-line">
                <strong>${plan.price}</strong>
                <span>per {plan.billingPeriod}</span>
              </div>
            </div>

            <p>{plan.description}</p>

            <div className="bullet-list">
              {(planFeatures[plan.id] || []).map((feature) => (
                <span key={feature}>{feature}</span>
              ))}
            </div>

            <button
              className="button button-primary"
              type="button"
              disabled={!isAuthenticated || status.saving}
              onClick={() => handleCheckout(plan.id)}
            >
              {status.saving ? "Starting membership..." : `Choose ${plan.name}`}
            </button>
          </article>
        ))}
      </div>

      <section className="cta-panel">
        <div>
          <p className="eyebrow">What unlocks after activation</p>
          <h3>Score entry, draw eligibility, charity preference, and winnings tracking.</h3>
          <p>
            The rest of the platform is already connected to subscription state, so
            activation immediately changes what the user can do.
          </p>
        </div>
      </section>

      {status.loading ? <p className="status-text">Loading plans...</p> : null}
      {status.error ? <p className="status-text status-text-error">{status.error}</p> : null}
      {status.success ? <p className="status-text status-text-success">{status.success}</p> : null}
    </div>
  );
}
