// jetton-wallet.tact
import "@stdlib/deploy";
import "@stdlib/address";

// Jetton Wallet - контракт для каждого пользователя, хранящий его баланс
contract JettonWallet with Deployable {
    owner_address: Address; // Адрес реального владельца TON
    jetton_master_address: Address; // Адрес Jetton Master контракта
    balance: Int; // Баланс токенов в этом кошельке

    init(owner_address: Address, jetton_master_address: Address, jetton_wallet_code: Cell) {
        self.owner_address = owner_address;
        self.jetton_master_address = jetton_master_address;
        self.balance = 0;
    }

    // --- Сообщения, обрабатываемые Jetton Wallet ---

    // Внутреннее сообщение для получения токенов (например, от Jetton Master при чеканке)
    mut fun MintInternal(amount: Int) {
        require(context().sender == self.jetton_master_address, "Only Jetton Master can mint");
        self.balance = self.balance + amount;
    }

    // Внутреннее сообщение для перевода токенов другому пользователю
    mut fun transfer(to: Address, amount: Int, query_id: Int) {
        // Проверяем, что отправитель является владельцем этого Jetton Wallet
        require(context().sender == self.owner_address, "Only owner can transfer");
        require(self.balance >= amount, "Insufficient balance");

        self.balance = self.balance - amount; // Уменьшаем баланс отправителя

        let destination_wallet = new JettonWallet(to, self.jetton_master_address, self.init_code).address;
        send(
            SendParameters{
                to: destination_wallet,
                value: 0,
                mode: SendRemainingValue,
                body: TransferNotification{
                    sender: self.owner_address,
                    amount: amount,
                    query_id: query_id
                }.toCell()
            }
        );
    }

    // Внутреннее сообщение, уведомляющее о получении токенов
    mut fun TransferNotification(sender: Address, amount: Int, query_id: Int) {
        // Проверяем, что сообщение пришло от Jetton Wallet того же Jetton Master
        // (более строгая проверка требует получения Jetton Master Address от отправителя)
        // Для простоты здесь проверяем, что это не от самого себя
        require(context().sender != myAddress(), "Cannot transfer to self via notification");

        self.balance = self.balance + amount; // Увеличиваем баланс
    }

    // --- Геттеры ---

    // Возвращает баланс токенов
    fun getBalance(): Int {
        return self.balance;
    }

    // Возвращает адрес владельца
    fun getOwner(): Address {
        return self.owner_address;
    }

    // Возвращает адрес Jetton Master
    fun getJettonMaster(): Address {
        return self.jetton_master_address;
    }
}