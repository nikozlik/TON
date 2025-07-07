// jetton-master.tact
import "@stdlib/deploy";
import "@stdlib/ownable";
import "@stdlib/address";

// Jetton Master - основной контракт токена
contract JettonMaster with Deployable, Ownable {
    // Общее предложение токена
    supply: Int;
    // Адрес контракта Jetton Wallet Code
    jetton_wallet_code: Cell;
    // Метаданные токена (имя, символ, десятичные знаки, URI)
    metadata_uri: String;

    init(owner: Address, jetton_wallet_code: Cell, metadata_uri: String) {
        self.owner = owner; // Адрес создателя/владельца токена
        self.supply = 0; // Изначально общее предложение равно 0
        self.jetton_wallet_code = jetton_wallet_code; // Код для Jetton Wallet
        self.metadata_uri = metadata_uri; // URI для метаданных токена
    }

    // --- Сообщения, обрабатываемые Jetton Master ---

    // Сообщение для чеканки новых токенов
    // Только владелец может вызывать эту функцию
    mut fun mint(to: Address, amount: Int) {
        self.requireOwner(); // Проверяем, что отправитель - владелец

        self.supply = self.supply + amount; // Увеличиваем общее предложение

        let wallet = self.getJettonWalletAddress(to); // Получаем адрес Jetton Wallet для получателя
        // Отправляем внутреннее сообщение Jetton Wallet
        send(
            SendParameters{
                to: wallet,
                value: 0, // Можно отправить небольшую комиссию, если требуется
                mode: SendRemainingValue, // Отправить оставшуюся стоимость транзакции
                body: MintInternal{ amount: amount }.toCell() // Сообщение для Jetton Wallet
            }
        );
    }

    // Сообщение для обновления метаданных токена
    mut fun updateMetadata(new_metadata_uri: String) {
        self.requireOwner();
        self.metadata_uri = new_metadata_uri;
    }

    // --- Геттеры для внешнего доступа ---

    // Возвращает общее предложение токена
    fun getSupply(): Int {
        return self.supply;
    }

    // Возвращает метаданные токена
    fun getMetadataUri(): String {
        return self.metadata_uri;
    }

    // Вычисляет адрес Jetton Wallet для заданного адреса пользователя
    fun getJettonWalletAddress(owner: Address): Address {
        return new JettonWallet(owner, myAddress(), self.jetton_wallet_code).address;
    }

    // Возвращает адрес Jetton Wallet Code
    fun getJettonWalletCode(): Cell {
        return self.jetton_wallet_code;
    }
}