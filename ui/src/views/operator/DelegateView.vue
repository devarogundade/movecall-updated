<script setup lang="ts">
import ChevronLeftIcon from '@/components/icons/ChevronLeftIcon.vue';
import OutIcon from '@/components/icons/OutIcon.vue';
import { notify } from '@/reactives/notify';
import { services, findOperator, findStrategy } from '@/scripts/constant';
import { Contract } from '@/scripts/contract';
import { Converter } from '@/scripts/converter';
import type { Operator } from '@/scripts/types';
import { useBalanceStore } from '@/stores/balance';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Clients } from '@/scripts/iota';
import { bcs } from '@iota/iota-sdk/bcs';
import { useWalletStore } from '@/stores/wallet';
import { useAdapter } from '@/scripts/config';

const route = useRoute();
const router = useRouter();
const { adapter } = useAdapter();
const balanceStore = useBalanceStore();
const walletStore = useWalletStore();
const operator = ref<Operator | undefined>(undefined);
const isDelegated = ref<boolean>(false);
const isDelegatedTo = ref<boolean>(false);

const delegate = async () => {
    if (!operator.value) return;
    if (!walletStore.address) {
        return notify.push({
            title: "Connect your wallet!",
            description: "Wallet connection error.",
            category: "error"
        });
    }
    const digest = await Contract.delegate(
        operator.value.address,
        adapter.value as any,
    );

    if (digest) {
        balanceStore.getBalances(walletStore.address);

        notify.push({
            title: "Delegation successful!",
            description: "You have successfully delegated your shares.",
            category: "success"
        });

        getIsDelegated();
        getIsDelegatedTo();
        balanceStore.getOperatorBalances();
    } else {
        notify.push({
            title: "Delegation failed!",
            description: "Transaction error.",
            category: "error"
        });
    }
};

const redelegate = async () => {
    if (!operator.value) return;
    if (!walletStore.address) {
        return notify.push({
            title: "Connect your wallet!",
            description: "Wallet connection error.",
            category: "error"
        });
    }

    const digest = await Contract.redelegate(
        operator.value.address,
        adapter.value as any,
    );

    if (digest) {
        balanceStore.getBalances(walletStore.address);
        balanceStore.getOperatorBalances();

        notify.push({
            title: "Redelegation successful!",
            description: "You have successfully redelegated your shares.",
            category: "success"
        });

        getIsDelegated();
        getIsDelegatedTo();
        balanceStore.getOperatorBalances();
    }

    else {
        notify.push({
            title: "Redelegation failed!",
            description: "Transaction error.",
            category: "error"
        });
    }
};

const undelegate = async () => {
    if (!walletStore.address) {
        return notify.push({
            title: "Connect your wallet!",
            description: "Wallet connection error.",
            category: "error"
        });
    }

    const digest = await Contract.undelegate(
        adapter.value as any
    );

    if (digest) {
        balanceStore.getBalances(walletStore.address);

        notify.push({
            title: "Undelegation successful!",
            description: "You have successfully undelegated your shares.",
            category: "success"
        });

        getIsDelegated();
        getIsDelegatedTo();
        balanceStore.getOperatorBalances();
    } else {
        notify.push({
            title: "Undelegation failed!",
            description: "Transaction error.",
            category: "error"
        });
    }
};

const getOperator = (address: string) => {
    operator.value = findOperator(address);
};

const getIsDelegated = async () => {
    if (!walletStore.address) return;

    const { results } = await Clients.iotaClient.devInspectTransactionBlock({
        transactionBlock: Contract.isDelegated(
            walletStore.address
        ),
        sender: walletStore.address,
    });
    if (!results) return;
    if (!results[0].returnValues) return;

    isDelegated.value = bcs
        .bool()
        .parse(Uint8Array.from(results[0].returnValues[0][0]));
};

const getIsDelegatedTo = async () => {
    if (!walletStore.address) return;
    if (!operator.value) return;

    if (!walletStore.address) return;

    const { results } = await Clients.iotaClient.devInspectTransactionBlock({
        transactionBlock: Contract.isDelegatedTo(
            walletStore.address,
            operator.value.address
        ),
        sender: walletStore.address,
    });
    if (!results) return;
    if (!results[0].returnValues) return;

    isDelegatedTo.value = bcs
        .bool()
        .parse(Uint8Array.from(results[0].returnValues[0][0]));
};

onMounted(() => {
    getOperator(route.params.id.toString());
    getIsDelegated();
    getIsDelegatedTo();
});
</script>

<template>
    <section>
        <div class="app_width">
            <div class="view">
                <div class="delegate" v-if="operator">
                    <div class="delegate_info">
                        <div class="head">
                            <RouterLink to="/operator">
                                <div class="back">
                                    <ChevronLeftIcon />
                                    <p>Operators</p>
                                </div>
                            </RouterLink>
                        </div>

                        <div class="stats">
                            <div class="stat">
                                <p>Total Restaked</p>
                                <div class="value">
                                    <p>
                                        {{
                                            Converter.toMoney((Converter.fromIOTA(balanceStore.total_shares[operator.address])))
                                        }}
                                    </p>
                                    <span>IOTA</span>
                                </div>
                            </div>

                            <div class="stat">
                                <p>Your Shares</p>
                                <div class="value">
                                    <p>
                                        {{
                                            Converter.toMoney(Converter.fromIOTA(balanceStore.your_shares[operator.address]))
                                        }}
                                    </p>
                                </div>
                            </div>


                            <div class="stat">
                                <p>Service Secured</p>
                                <div class="value">
                                    <p>1</p>
                                </div>
                            </div>
                        </div>

                        <div class="operator">
                            <div class="title">
                                <h3>About</h3>
                            </div>

                            <div class="operator_info">
                                <img :src="operator.image" alt="operator">
                                <p>{{ operator.name }}</p>
                            </div>

                            <div class="description">
                                {{ operator.about }}
                            </div>

                            <a v-if="operator.link" :href="operator.link" target="_blank" class="link">
                                <p>Learn more</p>
                                <OutIcon />
                            </a>
                        </div>
                    </div>

                    <div class="delegate_wrapper">
                        <div class="box">
                            <div class="label">You're delegating</div>

                            <div class="input">
                                <div class="strategy" v-for="strategyId in Object.keys(balanceStore.value_restaked)"
                                    v-show="balanceStore.value_restaked[strategyId] > 0" :key="strategyId">
                                    <input type="text"
                                        :value="Converter.toMoney(Converter.fromIOTA(balanceStore.value_restaked[strategyId]))"
                                        disabled>
                                    <p>{{ findStrategy(strategyId)?.symbol }}</p>
                                </div>
                            </div>

                            <button class="redelegate" v-if="!isDelegated" @click="delegate">Delegate</button>

                            <button class="redelegate" v-else-if="isDelegated && !isDelegatedTo"
                                @click="redelegate">Redelegate</button>

                            <button class="undelegate" v-else @click="undelegate">Undelegate</button>
                        </div>
                    </div>
                </div>

                <div class="coins" v-if="operator">
                    <div class="title">
                        <h3>Restaked Coins</h3>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <td>Coin</td>
                                <td>Value Restaked</td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="strategyId in Object.keys(balanceStore.total_shares[operator.address])"
                                v-show="balanceStore.total_shares[operator.address] > 0" :key="strategyId">
                                <td>
                                    <div class="service_info">
                                        <img :src="''" alt="service">
                                        <p>{{ strategyId }}</p>
                                    </div>
                                </td>
                                <td>
                                    {{
                                        Converter.toMoney(Converter.fromIOTA(balanceStore.total_shares[operator.address]))
                                    }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="services">
                    <div class="title">
                        <h3>Services</h3>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <td>Service</td>
                                <td>IOTA Restaked</td>
                                <td>Total Num. Operators</td>
                                <td>Total Num. Stakers</td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="service in services" :key="service.address"
                                @click="router.push(`/service/${service.address}`)">
                                <td>
                                    <div class="service_info">
                                        <img :src="service.image" alt="service">
                                        <p>{{ service.name }}</p>
                                    </div>
                                </td>
                                <td>
                                    {{ Converter.toMoney(2083) }}
                                </td>
                                <td>3</td>
                                <td>20</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.view {
    padding: 30px 0;
}

.delegate {
    margin-bottom: 30px;
    display: grid;
    grid-template-columns: 1fr 0.6fr;
    gap: 20px;
    justify-content: center;
}

.delegate_wrapper {
    background: var(--bg-light);
    border: 1px solid var(--bg-lighter);
    border-radius: 8px;
    padding: 16px;
    cursor: pointer;
    height: fit-content;
}

.label {
    font-size: 14px;
    color: var(--tx-dimmed);
}

.input {
    margin-top: 10px;
    background: var(--bg-lighter);
    border: 1px solid var(--bg-lightest);
    padding: 10px 16px;
    border-radius: 8px;
}

.strategy {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 50px;
    border-bottom: 1px solid var(--bg-lightest);
}

.strategy:last-child {
    border-bottom: none;
}


.strategy input {
    font-size: 26px;
    font-weight: 500;
    background: none;
    outline: none;
    border: none;
    color: var(--tx-normal);
}

.strategy p {
    font-size: 16px;
    color: var(--tx-dimmed);
    font-weight: 500;
}

.redelegate {
    margin-top: 20px;
    width: 100%;
    height: 50px;
    border: none;
    background: var(--primary-light);
    font-weight: 500;
    font-size: 16px;
    cursor: pointer;
    color: var(--bg);
    border-radius: 30px;
}

.undelegate {
    margin-top: 20px;
    width: 100%;
    height: 50px;
    border: none;
    background: var(--accent-red);
    font-weight: 500;
    font-size: 16px;
    cursor: pointer;
    color: var(--tx-normal);
    border-radius: 30px;
}

.head {
    display: flex;
    align-items: center;
}

.back {
    display: flex;
    align-items: center;
    gap: 8px;
}

.back p {
    font-size: 14px;
    color: var(--tx-semi);
}

.delegate_info {
    height: fit-content;
}

.stats {
    margin-top: 10px;
}

.stat {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 50px;
    border-bottom: 1px solid var(--bg-lighter);
}

.stat>p {
    font-size: 14px;
    color: var(--tx-semi);
    text-transform: uppercase;
}

.stat .value {
    display: flex;
    align-items: center;
    gap: 8px;
}

.stat .value p {
    font-size: 14px;
    color: var(--tx-normal);
}

.stat .value span {
    background: var(--bg-lighter);
    font-size: 12px;
    color: var(--tx-dimmed);
    padding: 4px 6px;
    border-radius: 4px;
}

.operator {
    margin-top: 20px;
}

.operator .title h3 {
    font-size: 16px;
    color: var(--tx-dimmed);
    font-weight: 500;
}

.operator_info {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 16px;
}

.operator_info img {
    height: 28px;
    width: 28px;
    border-radius: 8px;
}

.operator_info p {
    font-size: 16px;
    color: var(--tx-semi);
}

.operator .description {
    margin: 10px 0;
    font-size: 14px;
    color: var(--tx-dimmed);
    line-height: 20px;
}

.link {
    width: fit-content;
    display: flex;
    align-items: center;
    gap: 8px;
}

.link p {
    font-size: 14px;
    color: var(--accent-green);
}

table {
    margin-top: 10px;
    border-collapse: collapse;
    width: 100%;
}

td:first-child {
    width: 40%;
}

td:not(:first-child) {
    text-align: right;
}

thead tr {
    height: 40px;
    border-bottom: 1px solid var(--bg-lighter);
}

thead td {
    font-size: 12px;
    color: var(--tx-dimmed);
    text-transform: uppercase;
}

tbody tr {
    height: 60px;
    cursor: pointer;
    border-bottom: 1px solid transparent;
}

tbody tr:hover {
    background: var(--bg-lighter);
}

tbody td {
    color: var(--tx-semi);
}

tbody tr:not(:last-child) {
    border-bottom: 1px solid var(--bg-lighter);
}

.coins {
    background: var(--bg-light);
    padding: 16px;
    border-radius: 8px;
    border: 1px solid var(--bg-lighter);
}

.services {
    margin-top: 20px;
    background: var(--bg-light);
    padding: 16px;
    border-radius: 8px;
    border: 1px solid var(--bg-lighter);
}

.coins .title h3,
.services .title h3 {
    font-size: 20px;
    color: var(--tx-dimmed);
    font-weight: 500;
}

.service_info {
    display: flex;
    align-items: center;
    gap: 8px;
}

.service_info img {
    height: 24px;
    width: 24px;
    border-radius: 8px;
}

.service_info p {
    font-size: 14px;
    color: var(--tx-semi);
}
</style>