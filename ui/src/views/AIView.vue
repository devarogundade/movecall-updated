<script setup lang="ts">
import AIIcon from '@/components/icons/AIIcon.vue';
// import BulbIcon from '@/components/icons/BulbIcon.vue';
import CloseIcon from '@/components/icons/CloseIcon.vue';
// import SendIcon from '@/components/icons/SendIcon.vue';
// import ProgressBox from '@/components/ProgressBox.vue';
import { notify } from '@/reactives/notify';
import { AI, type Chat } from '@/scripts/ai';
import { useWalletStore } from '@/stores/wallet';
import { onMounted, ref, watch } from 'vue';

const Faqs = [
    "What is Restaking?",
    "Can IOTA LSTs be restaked?",
    "Risks of Restaking?",
    "What is IOTA LST?",
];

const text = ref<string>('');
const chats = ref<Chat[]>([]);
const showing = ref<boolean>(true);
const sending = ref<boolean>(false);
const progress = ref<boolean>(false);
const scrollContainer = ref<HTMLElement | null>(null);
const walletStore = useWalletStore();

const getChats = () => {
    if (!walletStore.address) return;
    AI.getChats(walletStore.address, (results) => {
        chats.value = results;

        setTimeout(() => {
            if (scrollContainer.value) {
                scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
            }
        }, 400);
    });
};

const sendText = async () => {
    if (sending.value) return;

    if (!walletStore.address) {
        return notify.push({
            title: "Connect your wallet!",
            description: "Wallet connection error.",
            category: "error"
        });
    }

    if (text.value == '') {
        return notify.push({
            title: "Enter a valid message",
            description: "Error text",
            category: "error"
        });
    }

    sending.value = true;
    showing.value = false;

    AI.chat(walletStore.address, text.value);

    text.value = '';

    setTimeout(() => {
        chats.value.push({
            from: 'movecall_ai',
            text: 'Thinking...',
            to: walletStore.address || 'user',
            timestampMs: Date.now()
        });
    }, 500);
};

onMounted(() => {
    getChats();
});

watch(walletStore, () => {
    getChats();
});
</script>

<template>
    <ProgressBox v-if="progress" />

    <div class="container" v-else>
        <div class="messages" ref="scrollContainer">
            <div class="no_message" v-if="chats.length == 0 || !walletStore.address">
                <div class="icon">
                    <AIIcon />
                </div>

                <h3>What can I help you with?</h3>
                <p>Your MoveCall and Restaking AI Assistant.</p>
            </div>

            <div v-show="walletStore.address" v-for="chat in chats.sort((a, b) => a.timestampMs - b.timestampMs)"
                :class="chat.from == walletStore.address ? 'message message_user' : 'message'">
                <img v-if="chat.from == walletStore.address" src="/images/colors.png" alt="">
                <img v-else src="/images/ai.png" alt="">
                <div class="text">{{ chat.text }}</div>
            </div>
        </div>
        <div class="form">
            <div class="faq" v-if="showing">
                <div class="title">
                    <BulbIcon />
                    <p>Suggestions for you.</p>
                </div>
                <div class="close" @click="showing = false">
                    <CloseIcon />
                </div>
                <div class="items">
                    <div class="item" v-for="faq in Faqs" @click="text = faq">{{ faq }}</div>
                </div>
            </div>

            <div class="input">
                <input type="text" v-model="text" placeholder="Ask a question">
                <button @click="sendText">
                    <SendIcon />
                    <p>Send</p>
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.container {
    height: calc(100vh - 90px);
    position: relative;
}

.messages {
    padding: 0 30px;
    max-height: calc(100vh - 180px);
    overflow: auto;
}

.messages::-webkit-scrollbar {
    display: none;
}

.message {
    padding: 30px 40px;
    display: grid;
    grid-template-columns: 40px 1fr;
    gap: 30px;
    font-size: 14px;
    line-height: 22px;
    color: var(--tx-normal);
    align-items: flex-end;
}

.message div {
    margin-bottom: 10px;
}

.message_user,
.message_user * {
    background: var(--bg-light) !important;
}

.message img {
    height: 40px;
    width: 40px;
    border-radius: 8px;
}

.text * {
    margin-bottom: 4px;
    font-weight: 400;
    color: var(--tx-normal);
    background: var(--bg);
    border-color: var(--bg-lightest);
}


.no_message {
    display: flex;
    align-items: center;
    flex-direction: column;
    padding: 120px 0;
    text-align: center;
}

.no_message .icon {
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: var(--bg-light);
    border: 1px solid var(--bg-lightest);
}

.no_message h3 {
    margin-top: 40px;
    font-size: 24px;
    color: var(--tx-normal);
}

.no_message p {
    margin-top: 12px;
    font-size: 16px;
    color: var(--tx-dimmed);
}

.form {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: 30px;
    z-index: 10;
    background: rgba(23, 23, 23, 0.8);
}

.faq .title {
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
}

.close {
    position: absolute;
    right: 40px;
    top: 40px;
    width: 36px;
    height: 30px;
    border-radius: 6px;
    cursor: pointer;
    border: 1px solid var(--bg-lightest);
    display: flex;
    align-items: center;
    justify-content: center;
}

.faq .title p {
    font-size: 16px;
    color: var(--tx-normal);
}

.faq .items {
    padding: 30px 0;
    width: 100%;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 40px;
}

.faq .item {
    padding: 25px 22px;
    text-align: center;
    border-radius: 8px;
    border: 1px solid var(--bg-lighter);
    color: var(--tx-normal);
    background: var(--bg);
    font-size: 14px;
    line-height: 26px;
    cursor: pointer;
    user-select: none;
}

.input {
    width: 100%;
    height: 44px;
    border-radius: 8px;
    background: var(--bg-light);
    border: 1px solid var(--bg-lightest);
    overflow: hidden;
    display: grid;
    grid-template-columns: 1fr 100px;
}

.input input {
    height: 100%;
    background: none;
    padding: 0 20px;
    border: none;
    outline: none;
    color: var(--tx-normal);
    font-size: 16px;
}

.input button {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-lightest);
    gap: 8px;
    border: none;
    cursor: pointer;
}

.input button p {
    font-size: 14px;
    color: var(--tx-normal);
}
</style>