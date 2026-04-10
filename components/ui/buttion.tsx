"use client";

import Link from "next/link";
import styled from "styled-components";

const Button = () => {
  return (
    <StyledWrapper>
      {/* Note: Nesting a Link inside a Button is technically invalid HTML. 
          It's better to style the Link directly as a button, but I've kept 
          your structure and fixed the logic. 
      */}
      <button className="button">
        <div className="button-inner">
          <div className="content-bg">
            <div className="content-padding">
              <Link href="/products" className="link">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </button>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .button {
    --stone-50: #fafaf9;
    --stone-800: #292524;
    --yellow-400: #facc15;

    font-family: "Rubik", sans-serif;
    cursor: pointer;
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    background: transparent;

    font-weight: 750;
    font-size: 20px;
    border-radius: 12px;
    color: var(--stone-50);
    min-width: 180px;
    
    /* Smooth transition for the overall button scale */
    transition: transform 0.2s ease-out;
  }

  .link {
    text-decoration: none;
    color: white;
    display: block;
    width: 100%;
  }

  .button-inner {
    padding: 2px;
    border-radius: 12px;
    background-color: var(--yellow-400);
    transform: translate(-3px, -3px);
    transition: all 200ms ease;
    /* Added initial shadow */
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  .content-bg {
    border-radius: 10px;
    background-color: var(--stone-800);
  }

  .content-padding {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 18px;
  }

  /* Hover Effects */
  .button:hover {
    /* Increases the overall size of the button */
    transform: scale(1.05);
  }

  .button:hover .button-inner {
    /* Flattens the offset and increases the shadow depth */
    transform: translate(0, 0);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
  }

  .button:active {
    transform: scale(0.98);
  }
`;

export default Button;