# 🧠 aip_share.py – send_message with agent_name

from aip_agent.agents.agent import Agent
from autogen_core._single_threaded_agent_runtime import SingleThreadedAgentRuntime
import sys
import logging
import asyncio

AGENT_NAME = "AinonAgent"

async def run(wallet_address: str):
    try:
        print(f"🔗 Initializing AIP Agent '{AGENT_NAME}'...")

        runtime = SingleThreadedAgentRuntime()
        agent = Agent(name=AGENT_NAME, runtime=runtime)

        await agent.initialize()

        print(f"📩 Sending message to AinonAgent memory...")

        message = f"User {wallet_address} deposited 0.005 BNB using auto_yield strategy."
        await agent.send_message(content=message, agent_name=AGENT_NAME)

        print(f"✅ Memory log sent via send_message ✅")
    except Exception as e:
        logging.error(f"❌ AIP Share Failed: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("⚠️ Usage: python3 aip_share.py <wallet_address>")
        sys.exit(1)

    wallet = sys.argv[1]
    asyncio.run(run(wallet))
